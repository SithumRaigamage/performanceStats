// On-disk metric history: one JSON-lines file per day, averaged into buckets.
import fs from 'fs';
import path from 'path';

const FIELDS = ['cpu', 'mem', 'disk', 'rx', 'tx', 'temp'];
const DAY_MS = 86_400_000;

function dayKey(t) {
  return new Date(t).toISOString().slice(0, 10); // UTC day: YYYY-MM-DD
}

export function sampleFromStats(s) {
  return {
    t: s.timestamp,
    cpu: s.cpu.percent,
    mem: s.mem.percent,
    disk: s.disk.percent,
    rx: Math.round(s.network.rxSec),
    tx: Math.round(s.network.txSec),
    temp: s.temperature?.main ?? null
  };
}

function average(samples) {
  const out = { t: samples[samples.length - 1].t };
  for (const f of FIELDS) {
    const vals = samples.map((x) => x[f]).filter((v) => typeof v === 'number');
    out[f] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }
  return out;
}

export class HistoryStore {
  constructor(dataDir, { bucketMs = 5000, retentionDays = 7, persist = true } = {}) {
    this.dir = path.join(dataDir, 'history');
    this.bucketMs = bucketMs;
    this.retentionDays = retentionDays;
    this.persist = persist;
    this.pending = [];
    this.recent = []; // in-memory, last hour of bucketed samples (for agents / fast queries)
    this.lastPrune = 0;
    if (persist) fs.mkdirSync(this.dir, { recursive: true });
  }

  add(stats) {
    const s = sampleFromStats(stats);
    this.pending.push(s);
    if (s.t - this.pending[0].t >= this.bucketMs) {
      const row = average(this.pending);
      this.pending = [];
      this.recent.push(row);
      const cutoff = row.t - 3_600_000;
      while (this.recent.length && this.recent[0].t < cutoff) this.recent.shift();
      if (this.persist) {
        fs.appendFile(path.join(this.dir, `${dayKey(row.t)}.jsonl`), JSON.stringify(row) + '\n', () => {});
        if (row.t - this.lastPrune > 3_600_000) this.prune(row.t);
      }
    }
  }

  prune(now = Date.now()) {
    this.lastPrune = now;
    const oldest = dayKey(now - this.retentionDays * DAY_MS);
    for (const f of fs.readdirSync(this.dir)) {
      const m = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(f);
      if (m && m[1] < oldest) fs.rmSync(path.join(this.dir, f), { force: true });
    }
  }

  async query(from, to = Date.now(), maxPoints = 600) {
    let rows = [];
    if (!this.persist) {
      rows = this.recent.filter((r) => r.t >= from && r.t <= to);
    } else {
      for (let day = from - (from % DAY_MS); day <= to; day += DAY_MS) {
        const file = path.join(this.dir, `${dayKey(day)}.jsonl`);
        let text;
        try {
          text = await fs.promises.readFile(file, 'utf8');
        } catch {
          continue;
        }
        for (const line of text.split('\n')) {
          if (!line) continue;
          try {
            const r = JSON.parse(line);
            if (r.t >= from && r.t <= to) rows.push(r);
          } catch {} // skip a partially written line
        }
      }
    }
    if (!maxPoints || rows.length <= maxPoints) return rows;
    // Downsample by averaging into equal-size groups.
    const size = Math.ceil(rows.length / maxPoints);
    const out = [];
    for (let i = 0; i < rows.length; i += size) out.push(average(rows.slice(i, i + size)));
    return out;
  }
}

export function toCSV(rows) {
  const header = 'timestamp_iso,timestamp_ms,cpu_percent,mem_percent,disk_percent,net_rx_bytes_per_sec,net_tx_bytes_per_sec,cpu_temp_c';
  const lines = rows.map((r) =>
    [new Date(r.t).toISOString(), r.t, r.cpu, r.mem, r.disk, r.rx, r.tx, r.temp ?? ''].join(',')
  );
  return [header, ...lines].join('\n') + '\n';
}

export const RANGES = { '15m': 900_000, '1h': 3_600_000, '6h': 21_600_000, '24h': DAY_MS, '7d': 7 * DAY_MS };
