// Threshold alerts: fire when a metric stays above its threshold for `durationSec`.
export const METRICS = {
  cpu: { label: 'CPU usage', unit: '%', read: (s) => s.cpu.percent },
  mem: { label: 'Memory usage', unit: '%', read: (s) => s.mem.percent },
  disk: { label: 'Disk usage', unit: '%', read: (s) => s.disk.percent },
  temp: { label: 'CPU temperature', unit: '°C', read: (s) => s.temperature?.main ?? null }
};

export class AlertEngine {
  constructor(getConfig) {
    this.getConfig = getConfig; // () => settings.alerts
    this.breachSince = new Map();
    this.lastFired = new Map();
    this.log = []; // most recent first
  }

  evaluate(stats) {
    const cfg = this.getConfig();
    if (!cfg?.enabled) return [];
    const fired = [];
    const now = stats.timestamp;
    for (const rule of cfg.rules || []) {
      const metric = METRICS[rule.metric];
      if (!rule.enabled || !metric) continue;
      const value = metric.read(stats);
      if (value == null || value < rule.threshold) {
        this.breachSince.delete(rule.id);
        continue;
      }
      if (!this.breachSince.has(rule.id)) this.breachSince.set(rule.id, now);
      const sustainedMs = now - this.breachSince.get(rule.id);
      const sinceLast = now - (this.lastFired.get(rule.id) ?? -Infinity);
      if (sustainedMs >= (rule.durationSec || 0) * 1000 && sinceLast >= (cfg.cooldownSec ?? 300) * 1000) {
        this.lastFired.set(rule.id, now);
        const held = rule.durationSec ? ` for ${rule.durationSec}s` : '';
        const event = {
          id: `${rule.id}-${now}`,
          ruleId: rule.id,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          at: now,
          host: stats.os?.hostname,
          title: `${metric.label} high`,
          message: `${metric.label} is ${value}${metric.unit} (above ${rule.threshold}${metric.unit}${held})`
        };
        fired.push(event);
        this.log.unshift(event);
        this.log.length = Math.min(this.log.length, 200);
      }
    }
    return fired;
  }
}
