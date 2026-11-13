import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const DEFAULT_SETTINGS = {
  alerts: {
    enabled: true,
    cooldownSec: 300,
    rules: [
      { id: 'cpu-high', metric: 'cpu', threshold: 90, durationSec: 30, enabled: true },
      { id: 'mem-high', metric: 'mem', threshold: 90, durationSec: 60, enabled: true },
      { id: 'disk-high', metric: 'disk', threshold: 90, durationSec: 0, enabled: true },
      { id: 'temp-high', metric: 'temp', threshold: 90, durationSec: 30, enabled: false }
    ]
  },
  history: { retentionDays: 7 },
  machines: [], // [{ id, name, url, token }]
  sharing: { enabled: false, port: 4100 } // "Allow this computer to be monitored"
};

export class SettingsStore {
  constructor(dataDir) {
    this.file = path.join(dataDir, 'settings.json');
    fs.mkdirSync(dataDir, { recursive: true });
    this.data = this.#load();
  }

  #load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        ...structuredClone(DEFAULT_SETTINGS),
        ...raw,
        alerts: { ...DEFAULT_SETTINGS.alerts, ...(raw.alerts || {}) },
        history: { ...DEFAULT_SETTINGS.history, ...(raw.history || {}) }
      };
    } catch {
      return structuredClone(DEFAULT_SETTINGS);
    }
  }

  get() {
    return this.data;
  }

  update(patch) {
    this.data = { ...this.data, ...patch };
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
    return this.data;
  }
}

// Persistent random token for agent mode, so it survives restarts.
export function loadOrCreateToken(dataDir) {
  const file = path.join(dataDir, 'agent-token');
  try {
    const t = fs.readFileSync(file, 'utf8').trim();
    if (t) return t;
  } catch {}
  fs.mkdirSync(dataDir, { recursive: true });
  const token = crypto.randomBytes(18).toString('base64url');
  fs.writeFileSync(file, token, { mode: 0o600 });
  return token;
}
