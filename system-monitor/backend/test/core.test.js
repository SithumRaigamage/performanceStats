import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { signLicense, verifyLicenseKey, LicenseStore } from '../src/license.js';
import { AlertEngine } from '../src/alerts.js';
import { HistoryStore, toCSV } from '../src/history.js';
import { createMonitorServer } from '../src/server.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sm-test-'));
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const PUB = publicKey.export({ type: 'spki', format: 'pem' });
const PRIV = privateKey.export({ type: 'pkcs8', format: 'pem' });

const fakeStats = (t, cpu, extra = {}) => ({
  timestamp: t,
  os: { hostname: 'test' },
  cpu: { percent: cpu },
  mem: { percent: 50 },
  disk: { percent: 40 },
  network: { rxSec: 100, txSec: 50 },
  temperature: null,
  ...extra
});

test('licence keys: valid, tampered, wrong signer', () => {
  const key = signLicense({ id: '1', name: 'A', email: 'a@x.lk', edition: 'pro' }, PRIV);
  assert.equal(verifyLicenseKey(key, PUB).valid, true);
  assert.equal(verifyLicenseKey(key, PUB).license.email, 'a@x.lk');
  const [p, s] = key.slice(4).split('.');
  const forged = Buffer.from(JSON.stringify({ product: 'system-monitor', id: '1', email: 'evil@x.lk' })).toString('base64url');
  assert.equal(verifyLicenseKey(`SM1-${forged}.${s}`, PUB).valid, false);
  const other = crypto.generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' });
  assert.equal(verifyLicenseKey(signLicense({ id: '2' }, other), PUB).valid, false);
  assert.equal(verifyLicenseKey('garbage', PUB).valid, false);
  assert.equal(verifyLicenseKey(`SM1-${p}`, PUB).valid, false);
});

test('licence store persists activation', () => {
  const dir = tmp();
  const key = signLicense({ id: '1', name: 'A', email: 'a@x.lk' }, PRIV);
  const s1 = new LicenseStore(dir, PUB);
  assert.equal(s1.status().licensed, false);
  assert.equal(s1.activate('nope').ok, false);
  assert.equal(s1.activate(key).ok, true);
  assert.equal(new LicenseStore(dir, PUB).status().licensed, true);
  s1.deactivate();
  assert.equal(new LicenseStore(dir, PUB).status().licensed, false);
});

test('alerts fire after sustained breach and respect cooldown', () => {
  const cfg = { enabled: true, cooldownSec: 60, rules: [{ id: 'c', metric: 'cpu', threshold: 80, durationSec: 5, enabled: true }] };
  const e = new AlertEngine(() => cfg);
  assert.equal(e.evaluate(fakeStats(0, 95)).length, 0); // breach starts
  assert.equal(e.evaluate(fakeStats(3000, 95)).length, 0); // not sustained yet
  assert.equal(e.evaluate(fakeStats(5000, 95)).length, 1); // fires
  assert.equal(e.evaluate(fakeStats(10000, 95)).length, 0); // cooldown
  assert.equal(e.evaluate(fakeStats(11000, 10)).length, 0); // recovers
  assert.equal(e.evaluate(fakeStats(70000, 95)).length, 0); // new breach, not sustained
  assert.equal(e.evaluate(fakeStats(75000, 95)).length, 1); // fires again after cooldown
  assert.equal(e.log.length, 2);
});

test('history buckets, persists, queries and exports CSV', async () => {
  const dir = tmp();
  const h = new HistoryStore(dir, { bucketMs: 5000 });
  const base = Date.now() - 60_000;
  for (let i = 0; i <= 30; i++) h.add(fakeStats(base + i * 1000, i));
  await new Promise((r) => setTimeout(r, 100)); // appendFile is async
  const rows = await h.query(base - 1, Date.now());
  assert.ok(rows.length >= 5, `expected buckets, got ${rows.length}`);
  assert.ok(rows.every((r) => typeof r.cpu === 'number'));
  const csv = toCSV(rows);
  assert.match(csv.split('\n')[0], /^timestamp_iso,timestamp_ms,cpu_percent/);
  assert.equal(csv.trim().split('\n').length, rows.length + 1);
  const down = await h.query(base - 1, Date.now(), 2);
  assert.ok(down.length <= 2);
});

test('server: licence gating and agent token auth', async () => {
  const key = signLicense({ id: '9', name: 'B', email: 'b@x.lk' }, PRIV);

  // Desktop-like server requiring a licence (uses a test public key via the store).
  const desk = createMonitorServer({ mode: 'dev', port: 0, dataDir: tmp(), requireLicense: true, intervalMs: 500 });
  desk.licenses.publicKeyPem = PUB;
  const p = await desk.start();
  const base = `http://127.0.0.1:${p}`;
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await fetch(`${base}/api/stats`)).status, 402);
  const bad = await fetch(`${base}/api/license`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'x' }) });
  assert.equal(bad.status, 400);
  const ok = await fetch(`${base}/api/license`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
  assert.equal(ok.status, 200);
  const stats = await (await fetch(`${base}/api/stats`)).json();
  assert.equal(typeof stats.cpu.percent, 'number');
  const alerts = await (await fetch(`${base}/api/alerts`)).json();
  assert.ok(alerts.config.rules.length > 0);
  const put = await fetch(`${base}/api/machines`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ machines: [{ name: 'srv', url: 'http://10.0.0.2:4100/', token: 't' }, { url: 'ftp://bad' }] }) });
  assert.deepEqual((await put.json()).machines.map((m) => m.url), ['http://10.0.0.2:4100']);
  const csv = await fetch(`${base}/api/history.csv?range=1h`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  await desk.stop();

  // Agent: token required, no licence, no local-only routes.
  const agent = createMonitorServer({ mode: 'agent', port: 0, host: '127.0.0.1', dataDir: tmp(), token: 'secret', intervalMs: 500 });
  const ap = await agent.start();
  const ab = `http://127.0.0.1:${ap}`;
  assert.equal((await fetch(`${ab}/api/stats`)).status, 401);
  assert.equal((await fetch(`${ab}/api/stats`, { headers: { Authorization: 'Bearer secret' } })).status, 200);
  assert.equal((await fetch(`${ab}/api/license`)).status, 404);
  assert.equal((await fetch(`${ab}/api/history?range=15m&token=secret`)).status, 200);
  await agent.stop();
});

test('server: embedded sharing agent re-broadcasts local stats', async () => {
  const desk = createMonitorServer({ mode: 'dev', port: 0, dataDir: tmp(), intervalMs: 300 });
  const p = await desk.start();
  const base = `http://127.0.0.1:${p}`;
  const free = 40000 + Math.floor(Math.random() * 20000);
  const s = await (await fetch(`${base}/api/sharing`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true, port: free }) })).json();
  assert.equal(s.enabled, true, s.error);
  assert.ok(s.token);
  await new Promise((r) => setTimeout(r, 900));
  const remote = await fetch(`http://127.0.0.1:${free}/api/stats`, { headers: { Authorization: `Bearer ${s.token}` } });
  assert.equal(remote.status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${free}/api/stats`)).status, 401);
  const off = await (await fetch(`${base}/api/sharing`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: false, port: free }) })).json();
  assert.equal(off.enabled, false);
  await desk.stop();
});
