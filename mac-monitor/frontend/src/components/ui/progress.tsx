import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-zinc-800', className)}
    >
      <div
        className={cn('h-full rounded-full bg-sky-500 transition-all duration-500', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
