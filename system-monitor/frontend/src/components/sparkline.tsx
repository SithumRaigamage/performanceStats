interface SparklineProps {
  values: number[];
  className?: string;
  stroke?: string;
}

// Minimal dependency-free line chart for 0–100% values.
export function Sparkline({ values, className, stroke = 'currentColor' }: SparklineProps) {
  const width = 300;
  const height = 60;
  if (values.length < 2) {
    return <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden />;
  }
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (Math.max(0, Math.min(100, v)) / 100) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
