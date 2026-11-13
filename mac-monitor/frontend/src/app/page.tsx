'use client';

import { Activity, ArrowDown, ArrowUp, Cpu, HardDrive, MemoryStick, Network } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkline } from '@/components/sparkline';
import { useStats } from '@/hooks/useStats';
import { formatBytes } from '@/lib/utils';

const HIGH_CPU = 80;

function levelClass(percent: number) {
  if (percent >= 80) return 'bg-red-500';
  if (percent >= 60) return 'bg-amber-500';
  return 'bg-sky-500';
}

export default function Dashboard() {
  const { stats, history, status, error, backendUrl } = useStats();

  const cpu = stats?.cpu.percent ?? 0;
  const mem = stats?.mem.percent ?? 0;
  const disk = stats?.disk.percent ?? 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Activity className="h-6 w-6 text-sky-400" /> Mac Monitor
          </h1>
          <p className="text-sm text-zinc-400">Live system stats from {backendUrl}</p>
        </div>
        <Badge variant={status === 'connected' ? 'success' : status === 'connecting' ? 'warning' : 'destructive'}>
          {status}
        </Badge>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}. Make sure the backend is running (<code className="font-mono">cd backend &amp;&amp; npm start</code>).
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Cpu className="h-4 w-4" /> CPU
            </CardTitle>
            {cpu >= HIGH_CPU && <Badge variant="destructive">High</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold tabular-nums">{cpu}%</div>
            <Progress value={cpu} indicatorClassName={levelClass(cpu)} />
            <p className="text-xs text-zinc-500">{stats ? `${stats.cpu.cores} cores` : '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <MemoryStick className="h-4 w-4" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold tabular-nums">{mem}%</div>
            <Progress value={mem} indicatorClassName={levelClass(mem)} />
            <p className="text-xs text-zinc-500">
              {stats ? `${formatBytes(stats.mem.used)} / ${formatBytes(stats.mem.total)}` : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <HardDrive className="h-4 w-4" /> Disk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold tabular-nums">{disk}%</div>
            <Progress value={disk} indicatorClassName={levelClass(disk)} />
            <p className="truncate text-xs text-zinc-500">
              {stats ? `${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.size)} · ${stats.disk.mount}` : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Network className="h-4 w-4" /> Network
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 tabular-nums">
            <div className="flex items-center gap-2 text-lg">
              <ArrowDown className="h-4 w-4 text-emerald-400" />
              {stats ? `${formatBytes(stats.network.rxSec)}/s` : '—'}
            </div>
            <div className="flex items-center gap-2 text-lg">
              <ArrowUp className="h-4 w-4 text-sky-400" />
              {stats ? `${formatBytes(stats.network.txSec)}/s` : '—'}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CPU — last 60s</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline values={history.map((h) => h.cpu)} className="h-24 w-full text-sky-400" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Memory — last 60s</CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline values={history.map((h) => h.mem)} className="h-24 w-full text-violet-400" />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 processes by CPU</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">CPU %</TableHead>
                <TableHead className="text-right">Mem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.topCpu.length ? (
                stats.topCpu.map((p) => (
                  <TableRow key={p.pid}>
                    <TableCell className="font-mono text-zinc-400">{p.pid}</TableCell>
                    <TableCell className="max-w-[16rem] truncate">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.cpu >= HIGH_CPU ? <Badge variant="destructive">{p.cpu}</Badge> : p.cpu}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.mem}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-zinc-500">
                    Waiting for data…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
