// HTTP + Socket.io server used by the desktop app, dev mode and headless agents.
//
// Modes:
//   desktop - bound to 127.0.0.1, serves the bundled UI, licence required, history + alerts on.
//   dev     - like desktop but no UI bundle and licence optional (REQUIRE_LICENSE=1 to test).
//   agent   - headless, listens on the network for a paid dashboard to connect.
//             Token required; live stats + last hour of history; no licence needed.
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Server } from 'socket.io';
import { collect } from './collector.js';
import { HistoryStore, toCSV, RANGES } from './history.js';
import { AlertEngine, METRICS } from './alerts.js';
import { SettingsStore, loadOrCreateToken } from './settings.js';
import { EventEmitter } from 'events';
import { LicenseStore } from './license.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const VERSION = pkg.version;

export function createMonitorServer({
  mode = 'dev',
  port = 4000,
  host = mode === 'agent' ? '0.0.0.0' : '127.0.0.1',
  dataDir,
  staticDir = null,
  token = null,
  requireLicense = mode === 'desktop',
  intervalMs = 1000,
  onAlert = () => {},
  source = null // optional EventEmitter emitting 'stats'; replaces this server's own sampling loop
} = {}) {
  if (!dataDir) throw new Error('dataDir is required');
  const isAgent = mode === 'agent';
  const settings = new SettingsStore(dataDir);
  const licenses = new LicenseStore(dataDir);
  const history = new HistoryStore(dataDir, {
    persist: !isAgent,
    retentionDays: settings.get().history.retentionDays
  });
  const alerts = new AlertEngine(() => settings.get().alerts);

  const licensed = () => !requireLicense || licenses.status().licensed;
  let latest = null;
  const feed = new EventEmitter(); // re-broadcasts samples to an embedded sharing agent
  let sharing = null; // embedded agent server when "Allow remote monitoring" is on

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // CORS: agents are reached cross-origin from a dashboard; desktop UI is same-origin.
  app.use((req, res, next) => {
    if (isAgent || mode === 'dev') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  const tokenOk = (provided) => !token || provided === token;
  const auth = (req, res, next) => {
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!tokenOk(bearer || req.query.token)) return res.status(401).json({ error: 'unauthorized' });
    next();
  };
  const needLicense = (_req, res, next) => (licensed() ? next() : res.status(402).json({ error: 'license_required' }));
  const localOnly = (_req, res, next) => (isAgent ? res.status(404).json({ error: 'not_available_on_agent' }) : next());

  // --- always available -----------------------------------------------------
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode, version: VERSION, app: 'system-monitor' }));

  app.get('/api/license', localOnly, (_req, res) => res.json({ required: requireLicense, ...licenses.status() }));
  app.post('/api/license', localOnly, (req, res) => {
    const r = licenses.activate(req.body?.key);
    if (!r.ok) return res.status(400).json(r);
    io.emit('license', { required: requireLicense, ...licenses.status() });
    res.json(r);
  });
  app.delete('/api/license', localOnly, (_req, res) => {
    const s = licenses.deactivate();
    io.emit('license', { required: requireLicense, ...s });
    res.json(s);
  });

  // --- data (token on agents, licence on desktop) ---------------------------
  app.get('/api/stats', auth, needLicense, async (_req, res, next) => {
    try {
      res.json(latest ?? (await collect()));
    } catch (e) {
      next(e);
    }
  });

  function parseRange(q) {
    const to = q.to ? Number(q.to) : Date.now();
    const from = q.from ? Number(q.from) : to - (RANGES[q.range] ?? RANGES['1h']);
    return { from, to };
  }

  app.get('/api/history', auth, needLicense, async (req, res, next) => {
    try {
      const { from, to } = parseRange(req.query);
      const points = Math.min(Number(req.query.points) || 600, 5000);
      res.json({ from, to, rows: await history.query(from, to, points) });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/history.csv', auth, needLicense, async (req, res, next) => {
    try {
      const { from, to } = parseRange(req.query);
      const rows = await history.query(from, to, 0); // full resolution
      const name = `system-monitor_${latest?.os?.hostname ?? 'host'}_${new Date(from).toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.send(toCSV(rows));
    } catch (e) {
      next(e);
    }
  });

  // --- settings (desktop / dev only) ----------------------------------------
  app.get('/api/alerts', localOnly, needLicense, (_req, res) =>
    res.json({ config: settings.get().alerts, metrics: Object.fromEntries(Object.entries(METRICS).map(([k, v]) => [k, { label: v.label, unit: v.unit }])), log: alerts.log.slice(0, 50) })
  );
  app.put('/api/alerts', localOnly, needLicense, (req, res) => {
    const c = req.body || {};
    const rules = Array.isArray(c.rules)
      ? c.rules
          .filter((r) => METRICS[r.metric])
          .map((r, i) => ({
            id: String(r.id || `${r.metric}-${i}`),
            metric: r.metric,
            threshold: Math.max(1, Math.min(150, Number(r.threshold) || 90)),
            durationSec: Math.max(0, Math.min(3600, Number(r.durationSec) || 0)),
            enabled: !!r.enabled
          }))
      : settings.get().alerts.rules;
    const next = {
      enabled: c.enabled ?? settings.get().alerts.enabled,
      cooldownSec: Math.max(10, Math.min(86_400, Number(c.cooldownSec) || 300)),
      rules
    };
    settings.update({ alerts: next });
    res.json({ config: next });
  });

  app.get('/api/machines', localOnly, needLicense, (_req, res) => res.json({ machines: settings.get().machines }));
  app.put('/api/machines', localOnly, needLicense, (req, res) => {
    const list = Array.isArray(req.body?.machines) ? req.body.machines : [];
    const machines = list
      .filter((m) => m && /^https?:\/\//.test(m.url || ''))
      .slice(0, 50)
      .map((m) => ({
        id: String(m.id || Math.random().toString(36).slice(2)),
        name: String(m.name || m.url).slice(0, 80),
        url: String(m.url).replace(/\/+$/, ''),
        token: String(m.token || '')
      }));
    settings.update({ machines });
    res.json({ machines });
  });

  app.get('/api/settings', localOnly, needLicense, (_req, res) => res.json({ history: settings.get().history, dataDir }));
  app.put('/api/settings', localOnly, needLicense, (req, res) => {
    const days = Math.max(1, Math.min(90, Number(req.body?.history?.retentionDays) || 7));
    settings.update({ history: { retentionDays: days } });
    history.retentionDays = days;
    res.json({ history: settings.get().history, dataDir });
  });

  // --- "Allow this computer to be monitored" (desktop/dev only) -------------
  const sharingDir = path.join(dataDir, 'sharing');
  function sharingStatus() {
    const cfg = settings.get().sharing || { enabled: false, port: 4100 };
    const ips = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => i.address);
    return { enabled: !!sharing, port: cfg.port, token: sharing ? loadOrCreateToken(sharingDir) : null, error: sharingError, ips };
  }
  let sharingError = null;
  async function setSharing(enabled, sharePort = settings.get().sharing?.port || 4100) {
    sharingError = null;
    if (sharing) {
      await sharing.stop();
      sharing = null;
    }
    if (enabled) {
      const agent = createMonitorServer({ mode: 'agent', port: sharePort, dataDir: sharingDir, token: loadOrCreateToken(sharingDir), source: feed });
      try {
        await agent.start();
        sharing = agent;
      } catch (e) {
        sharingError = e.code === 'EADDRINUSE' ? `Port ${sharePort} is already in use` : String(e.message || e);
        enabled = false;
      }
    }
    settings.update({ sharing: { enabled, port: sharePort } });
    return sharingStatus();
  }

  app.get('/api/sharing', localOnly, needLicense, (_req, res) => res.json(sharingStatus()));
  app.put('/api/sharing', localOnly, needLicense, async (req, res, next) => {
    try {
      const port = Math.max(1024, Math.min(65535, Number(req.body?.port) || 4100));
      res.json(await setSharing(!!req.body?.enabled, port));
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/sharing/rotate-token', localOnly, needLicense, async (_req, res, next) => {
    try {
      fs.rmSync(path.join(sharingDir, 'agent-token'), { force: true });
      const was = !!sharing;
      res.json(was ? await setSharing(true) : sharingStatus());
    } catch (e) {
      next(e);
    }
  });

  // --- bundled UI ------------------------------------------------------------
  if (staticDir) {
    app.use(express.static(staticDir, { extensions: ['html'] }));
    app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'internal_error', detail: String(err?.message || err) });
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: isAgent || mode === 'dev' ? { origin: '*' } : undefined });

  io.use((socket, next) => (tokenOk(socket.handshake.auth?.token) ? next() : next(new Error('unauthorized'))));
  io.on('connection', (socket) => {
    if (!isAgent) socket.emit('license', { required: requireLicense, ...licenses.status() });
    if (!licensed()) return socket.emit('license_required');
    if (latest) socket.emit('stats', latest);
  });

  // --- sampling loop: always on, so history + alerts work with the window closed
  let timer = null;
  let detach = null;
  let busy = false;
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      latest = await collect();
      feed.emit('stats', latest);
      history.add(latest);
      if (licensed()) {
        io.emit('stats', latest);
        if (!isAgent) {
          for (const a of alerts.evaluate(latest)) {
            io.emit('alert', a);
            try {
              onAlert(a);
            } catch (e) {
              console.error('onAlert failed', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to collect stats:', err);
      io.emit('stats_error', { message: 'Failed to collect stats', detail: String(err) });
    } finally {
      busy = false;
    }
  }

  return {
    app,
    server,
    io,
    licenses,
    settings,
    get latest() {
      return latest;
    },
    start() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, async () => {
          if (source) {
            const onStats = (s) => {
              latest = s;
              history.add(s);
              io.emit('stats', s);
            };
            source.on('stats', onStats);
            detach = () => source.off('stats', onStats);
          } else {
            timer = setInterval(tick, intervalMs);
            tick();
          }
          if (!isAgent && settings.get().sharing?.enabled) await setSharing(true).catch(() => {});
          resolve(server.address().port);
        });
      });
    },
    async stop() {
      clearInterval(timer);
      detach?.();
      if (sharing) await sharing.stop();
      io.close();
      return new Promise((r) => server.close(() => r()));
    }
  };
}
