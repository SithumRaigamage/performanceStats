'use client';

import { useMemo, useRef, useState } from 'react';
import { formatTime } from '@/lib/utils';

export interface Series {
  key: string;
  label: string;
  color: string; // CSS colour
  values: (number | null)[];
  format?: (v: number) => string;
}

interface LineChartProps {
  times: number[];
  series: Series[];
  max?: number; // y-axis max; auto when omitted
  height?: number;
  showDates?: boolean;
  emptyText?: string;
}

const W = 800;
const PAD = { l: 40, r: 8, t: 8, b: 22 };

/** Dependency-free multi-series line chart with a hover crosshair. */
export function LineChart({ times, series, max, height = 180, showDates, emptyText = 'No data yet' }: LineChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const yMax = useMemo(() => {
    if (max) return max;
    const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
    const m = Math.max(1, ...all);
    const mag = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / mag) * mag;
  }, [series, max]);

  if (times.length < 2) {
    return <div className="flex items-center justify-center text-sm text-zinc-500" style={{ height }}>{emptyText}</div>;
  }

  const H = height;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const x = (t: number) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * iw;
  const y = (v: number) => PAD.t + ih - (Math.min(v, yMax) / yMax) * ih;
  const fmtY = series[0]?.format ?? ((v: number) => `${Math.round(v)}`);

  function path(values: (number | null)[]) {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = t0 + ((px - PAD.l) / iw) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < times.length; i++) if (Math.abs(times[i] - t) < Math.abs(times[best] - t)) best = i;
    setHover(best);
  }

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(yMax * f)} y2={y(yMax * f)} stroke="#27272a" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={PAD.l - 6} y={y(yMax * f) + 4} textAnchor="end" fontSize={11} fill="#71717a">
              {fmtY(yMax * f)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 4} fontSize={11} fill="#71717a">{formatTime(t0, showDates)}</text>
        <text x={W - PAD.r} y={H - 4} fontSize={11} fill="#71717a" textAnchor="end">{formatTime(t1, showDates)}</text>
        {series.map((s) => (
          <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {hover != null && (
          <line x1={x(times[hover])} x2={x(times[hover])} y1={PAD.t} y2={PAD.t + ih} stroke="#a1a1aa" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute right-2 top-1 rounded-md border border-zinc-700 bg-zinc-900/95 px-2.5 py-1.5 text-xs shadow">
          <div className="mb-0.5 text-zinc-400">{formatTime(times[hover], true)}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2 tabular-nums">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}: {s.values[hover] == null ? '—' : (s.format ?? ((v: number) => `${v}`))(s.values[hover] as number)}
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-400">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
