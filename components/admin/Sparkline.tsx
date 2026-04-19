"use client";

// Dependency-free sparkline. SVG path, no D3, no recharts — faster
// load and one less dependency vs. a chart lib for 20-point mini graphs.

interface Props {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
  /** Show a single filled dot at the last point. */
  marker?: boolean;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = "#10b981",
  fill = "rgba(16,185,129,0.10)",
  className,
  marker = true,
}: Props) {
  if (!data.length) {
    return <div className={className} style={{ width, height }} />;
  }
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  const last = points[points.length - 1];

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {marker && <circle cx={last.x} cy={last.y} r={2.5} fill={stroke} />}
    </svg>
  );
}
