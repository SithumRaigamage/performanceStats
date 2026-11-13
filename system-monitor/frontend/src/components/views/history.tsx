'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart } from '@/components/line-chart';
import { api, apiUrl } from '@/lib/api';
import type { HistoryRow, Target } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';

const LOCAL_RANGES = ['15m', '1h', '6h', '24h', '7d'] as const;
const REMOTE_RANGES = ['15m', '1h'] as const; // agents keep the last hour in memory
type Range = (typeof LOCAL_RANGES)[number];

export function HistoryView({ target }: { target: Target }) {
  const ranges = target.remote ? REMOTE_RANGES : LOCAL_RANGES;
  const [range, setRange] = useState<Range>('1h');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ rows: HistoryRow[] }>(`/api/history?range=${range}&points=600`, {}, target);
      setRows(r.rows);
    } catch {
      setError('Could not load history');
    } finally {
      setLoading(false);
    }
  }, [range, target]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const times = rows.map((r) => r.t);
  const longRange = range === '24h' || range === '7d';
  const hasTemp = rows.some((r) => r.temp != null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-zinc-900 p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn('rounded-md px-3 py-1.5 text-sm', range === r ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200')}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
          </Button>
          <a href={apiUrl(`/api/history.csv?range=${range}`, target)} download>
            <Button variant="secondary">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {target.remote && <p className="text-xs text-zinc-500">Remote agents keep the last hour. Full history is stored for this computer.</p>}

      <Card>
        <CardHeader>
          <CardTitle>CPU, memory & disk</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            times={times}
            max={100}
            height={220}
            showDates={longRange}
            emptyText="History builds up while the app is running"
            series={[
              { key: 'cpu', label: 'CPU', color: '#38bdf8', values: rows.map((r) => r.cpu), format: (v) => `${Math.round(v)}%` },
              { key: 'mem', label: 'Memory', color: '#a78bfa', values: rows.map((r) => r.mem), format: (v) => `${Math.round(v)}%` },
              { key: 'disk', label: 'Disk', color: '#f59e0b', values: rows.map((r) => r.disk), format: (v) => `${Math.round(v)}%` }
            ]}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              times={times}
              height={160}
              showDates={longRange}
              series={[
                { key: 'rx', label: 'Download', color: '#34d399', values: rows.map((r) => r.rx), format: (v) => `${formatBytes(v)}/s` },
                { key: 'tx', label: 'Upload', color: '#38bdf8', values: rows.map((r) => r.tx), format: (v) => `${formatBytes(v)}/s` }
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CPU temperature</CardTitle>
          </CardHeader>
          <CardContent>
            {hasTemp ? (
              <LineChart
                times={times}
                height={160}
                showDates={longRange}
                series={[{ key: 'temp', label: 'CPU °C', color: '#f87171', values: rows.map((r) => r.temp), format: (v) => `${Math.round(v)}°C` }]}
              />
            ) : (
              <p className="py-12 text-center text-sm text-zinc-500">Temperature isn&apos;t available on this machine.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
