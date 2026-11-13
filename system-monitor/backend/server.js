#!/usr/bin/env node
// CLI entry for dev mode, headless agents and quick checks.
//
//   node server.js                     dev mode on http://localhost:4000 (for `npm run dev` in ../frontend)
//   node server.js --agent             headless agent on 0.0.0.0:4100, prints its access token
//   node server.js --once              print one sample as JSON and exit (used by CI on every OS)
//
// Options: --port N  --host H  --token T  --data-dir DIR  --interval MS
import os from 'os';
import path from 'path';
import { createMonitorServer, VERSION } from './src/server.js';
import { collect } from './src/collector.js';
import { loadOrCreateToken } from './src/settings.js';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 ? argv[i + 1] : undefined;
};

if (flag('once')) {
  try {
    console.log(JSON.stringify(await collect(), null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (flag('version')) {
  console.log(VERSION);
  process.exit(0);
}

const isAgent = flag('agent');
const mode = isAgent ? 'agent' : 'dev';
const dataDir = path.resolve(
  opt('data-dir') || process.env.DATA_DIR || (isAgent ? path.join(os.homedir(), '.system-monitor-agent') : path.join(process.cwd(), '.data'))
);
const token = isAgent ? opt('token') || process.env.AGENT_TOKEN || loadOrCreateToken(dataDir) : opt('token') || process.env.TOKEN || null;

const monitor = createMonitorServer({
  mode,
  port: Number(opt('port') || process.env.PORT) || (isAgent ? 4100 : 4000),
  host: opt('host') || process.env.HOST || (isAgent ? '0.0.0.0' : '127.0.0.1'),
  dataDir,
  token,
  requireLicense: !isAgent && process.env.REQUIRE_LICENSE === '1',
  intervalMs: Number(opt('interval') || process.env.INTERVAL_MS) || 1000,
  onAlert: (a) => console.log(`[alert] ${a.message}`)
});

const port = await monitor.start();
if (isAgent) {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log(`System Monitor agent v${VERSION} listening on port ${port}`);
  console.log(`Add it in the dashboard (Machines tab) with:`);
  for (const ip of ips.length ? ips : ['<this-machine-ip>']) console.log(`  URL:   http://${ip}:${port}`);
  console.log(`  Token: ${token}`);
} else {
  console.log(`System Monitor backend v${VERSION} (${mode}) on http://localhost:${port}`);
}

const shutdown = () => monitor.stop().then(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
