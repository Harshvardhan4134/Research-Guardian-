"use client";

type Series = { key: string; label: string; color: string; values: number[] };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function linePath(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  return values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (width - 2) + 1;
      const y = height - 1 - ((v - min) / range) * (height - 2);
      return `${x},${clamp(y, 1, height - 1)}`;
    })
    .join(" ");
}

export function MultiLineChart({
  series,
  height = 160,
}: {
  series: Series[];
  height?: number;
}) {
  const width = 520;
  const bg = "var(--card-muted)";
  const grid = "rgba(100,116,139,0.22)";

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Topic Intelligence chart"
      className="block"
      style={{
        background: bg,
        borderRadius: 12,
        border: "1px solid var(--border)",
      }}
    >
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <line
          key={t}
          x1="0"
          x2={width}
          y1={height * t}
          y2={height * t}
          stroke={grid}
          strokeWidth="1"
        />
      ))}

      {series.map((s) => (
        <polyline
          key={s.key}
          points={linePath(s.values, width, height)}
          fill="none"
          stroke={s.color}
          strokeOpacity="0.95"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

