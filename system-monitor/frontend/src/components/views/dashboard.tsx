'use client';

import { ArrowDown, ArrowUp, Battery, BatteryCharging, Cpu, HardDrive, MemoryStick, Network, Thermometer, MonitorCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart } from '@/components/line-chart';
import type { Stats } from '@/lib/types';
import type { LivePoint } from '@/hooks/useMonitor';
import { formatBytes, levelClass } from '@/lib/utils';

const HIGH = 80;

function Metric({ icon, title, percent, sub, badge }: { icon: React.ReactNode; title: string; percent: number; sub: string; badge?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {icon} {title}
        </CardTitle>
        {badge}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-semibold tabular-nums">{percent}%</div>
        <Progress value={percent} indicatorClassName={levelClass(percent)} />
        <p className="truncate text-xs text-zinc-500">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardView({ stats, live }: { stats: Stats | null; live: LivePoint[] }) {
  if (!stats) {
    return <p className="py-20 text-center text-zinc-500">Waiting for data…</p>;
  }
  const { cpu, mem, disk, network, temperature, gpus, battery, disks } = stats;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Cpu className="h-4 w-4" />}
          title="CPU"
          percent={cpu.percent}
          sub={`${cpu.cores} cores${temperature?.main ? ` · ${temperature.main}°C` : ''}`}
          badge={cpu.percent >= HIGH ? <Badge variant="destructive">High</Badge> : undefined}
        />
        <Metric
          icon={<MemoryStick className="h-4 w-4" />}
          title="Memory"
          percent={mem.percent}
          sub={`${formatBytes(mem.used)} / ${formatBytes(mem.total)}${mem.swapUsed ? ` · swap ${formatBytes(mem.swapUsed)}` : ''}`}
        />
        <Metric
          icon={<HardDrive className="h-4 w-4" />}
          title="Disk"
          percent={disk.percent}
          sub={`${formatBytes(disk.used)} / ${formatBytes(disk.size)} · ${disk.mount}`}
        />
        <Card>
          <CardHeader>
            <CardTitle>
              <Network className="h-4 w-4" /> Network
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 tabular-nums">
            <div className="flex items-center gap-2 text-lg">
              <ArrowDown className="h-4 w-4 text-emerald-400" /> {formatBytes(network.rxSec)}/s
            </div>
            <div className="flex items-center gap-2 text-lg">
              <ArrowUp className="h-4 w-4 text-sky-400" /> {formatBytes(network.txSec)}/s
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Live — last 60 seconds</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            times={live.map((p) => p.t)}
            max={100}
            height={160}
            series={[
              { key: 'cpu', label: 'CPU', color: '#38bdf8', values: live.map((p) => p.cpu), format: (v) => `${Math.round(v)}%` },
              { key: 'mem', label: 'Memory', color: '#a78bfa', values: live.map((p) => p.mem), format: (v) => `${Math.round(v)}%` }
            ]}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Cpu className="h-4 w-4" /> Per-core load
            </CardTitle>
            <span className="truncate text-xs text-zinc-500">{stats.os.cpuModel}</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5">
              {cpu.perCore.map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1" title={`Core ${i + 1}: ${v}%`}>
                  <div className="relative h-16 w-full overflow-hidden rounded bg-zinc-800">
                    <div className={`absolute bottom-0 w-full transition-all duration-500 ${levelClass(v)}`} style={{ height: `${v}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-zinc-500">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <MonitorCog className="h-4 w-4" /> Hardware
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Thermometer className="h-4 w-4" /> CPU temperature
              </span>
              <span className="tabular-nums">
                {temperature?.main != null ? `${temperature.main}°C` : <span className="text-zinc-500">Not available</span>}
                {temperature?.max != null && temperature.max !== temperature.main ? <span className="text-zinc-500"> (max {temperature.max}°C)</span> : null}
              </span>
            </div>

            {gpus.length === 0 && <p className="text-zinc-500">No GPU information.</p>}
            {gpus.map((g, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-zinc-400">{g.model}</span>
                  <span className="shrink-0 tabular-nums">
                    {g.utilization != null ? `${g.utilization}%` : ''}
                    {g.temperature != null ? ` · ${g.temperature}°C` : ''}
                    {g.memTotal ? ` · ${g.memUsed != null ? `${formatBytes(g.memUsed * 1048576)} / ` : ''}${formatBytes(g.memTotal * 1048576)}` : ''}
                  </span>
                </div>
                {g.utilization != null && <Progress value={g.utilization} indicatorClassName={levelClass(g.utilization)} />}
              </div>
            ))}

            {battery && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-zinc-400">
                    {battery.isCharging ? <BatteryCharging className="h-4 w-4" /> : <Battery className="h-4 w-4" />} Battery
                  </span>
                  <span className="tabular-nums">
                    {battery.percent ?? '—'}%{battery.isCharging ? ' · charging' : battery.acConnected ? ' · plugged in' : ''}
                  </span>
                </div>
                <Progress value={battery.percent ?? 0} indicatorClassName={(battery.percent ?? 100) <= 20 ? 'bg-red-500' : 'bg-emerald-500'} />
                <p className="text-xs text-zinc-500">
                  {battery.health != null ? `Health ${battery.health}%` : 'Health unknown'}
                  {battery.cycleCount != null ? ` · ${battery.cycleCount} cycles` : ''}
                  {battery.timeRemaining != null && !battery.isCharging ? ` · ~${Math.floor(battery.timeRemaining / 60)}h ${battery.timeRemaining % 60}m left` : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
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
                {stats.topCpu.map((p) => (
                  <TableRow key={p.pid}>
                    <TableCell className="font-mono text-zinc-400">{p.pid}</TableCell>
                    <TableCell className="max-w-[14rem] truncate">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.cpu >= HIGH ? <Badge variant="destructive">{p.cpu}</Badge> : p.cpu}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.mem}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <HardDrive className="h-4 w-4" /> Drives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {disks.map((d) => (
              <div key={d.mount} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{d.mount}</span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {formatBytes(d.used)} / {formatBytes(d.size)}
                  </span>
                </div>
                <Progress value={d.percent} indicatorClassName={levelClass(d.percent)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
