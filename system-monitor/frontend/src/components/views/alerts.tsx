'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, Input } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { AlertConfig, AlertEvent, MetricKey } from '@/lib/types';
import { formatTime } from '@/lib/utils';

interface AlertsResponse {
  config: AlertConfig;
  metrics: Record<MetricKey, { label: string; unit: string }>;
  log: AlertEvent[];
}

export function AlertsView({ recent }: { recent: AlertEvent[] }) {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AlertsResponse>('/api/alerts')
      .then((r) => {
        setData(r);
        setConfig(r.config);
      })
      .catch(() => setError('Could not load alert settings'));
  }, []);

  async function save() {
    if (!config) return;
    try {
      const r = await api<{ config: AlertConfig }>('/api/alerts', { method: 'PUT', body: JSON.stringify(config) });
      setConfig(r.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Could not save alert settings');
    }
  }

  function updateRule(i: number, patch: Partial<AlertConfig['rules'][number]>) {
    if (!config) return;
    setConfig({ ...config, rules: config.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  const log = [...recent, ...(data?.log ?? [])].filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i).slice(0, 50);

  if (!config || !data) return <p className="py-20 text-center text-zinc-500">{error ?? 'Loading…'}</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>
            <Bell className="h-4 w-4" /> Alert rules
          </CardTitle>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="accent-sky-500" />
            Alerts on
          </label>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            You get a desktop notification when a value stays above its limit for the time you set. Alerts keep working while the window is closed (the app stays in the tray / menu bar).
          </p>
          <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {config.rules.map((rule, i) => {
              const m = data.metrics[rule.metric];
              return (
                <div key={rule.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_1fr_auto_auto]">
                  <input type="checkbox" checked={rule.enabled} onChange={(e) => updateRule(i, { enabled: e.target.checked })} className="accent-sky-500" aria-label={`Enable ${m.label} alert`} />
                  <span className="text-sm font-medium">{m.label}</span>
                  <label className="col-start-2 flex items-center gap-2 text-sm text-zinc-400 sm:col-start-auto">
                    above
                    <Input type="number" min={1} max={150} value={rule.threshold} onChange={(e) => updateRule(i, { threshold: Number(e.target.value) })} className="w-20" />
                    {m.unit}
                  </label>
                  <label className="col-start-2 flex items-center gap-2 text-sm text-zinc-400 sm:col-start-auto">
                    for
                    <Input type="number" min={0} max={3600} value={rule.durationSec} onChange={(e) => updateRule(i, { durationSec: Number(e.target.value) })} className="w-20" />
                    sec
                  </label>
                </div>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            Don&apos;t repeat the same alert for
            <Input type="number" min={10} value={config.cooldownSec} onChange={(e) => setConfig({ ...config, cooldownSec: Number(e.target.value) })} className="w-24" />
            seconds
          </label>
          <Button onClick={save}>{saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save'}</Button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="flex items-center gap-2 py-8 text-sm text-zinc-500">
              <BellOff className="h-4 w-4" /> No alerts yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {log.map((a) => (
                <li key={a.id} className="rounded-lg bg-zinc-800/50 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-red-300">{a.title}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{formatTime(a.at, true)}</span>
                  </div>
                  <p className="text-zinc-400">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
