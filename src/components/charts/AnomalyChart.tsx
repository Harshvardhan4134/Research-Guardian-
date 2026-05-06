"use client";

type Anomaly = { index: number; label: string; severity: "LOW" | "MEDIUM" | "HIGH" };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AnomalyChart({
  values,
  anomalies,
  height = 160,
}: {
  values: number[];
  anomalies: Anomaly[];
  height?: number;
}) {
  const width = 520;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (width - 2) + 1;
      const y = height - 1 - ((v - min) / range) * (height - 2);
      return { x, y: clamp(y, 1, height - 1) };
    });

  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const grid = "rgba(148,163,184,0.18)";

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Anomaly Detection chart"
      className="block"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: 12,
        border: "1px solid var(--border)",
      }}
    >
      {[0.25, 0.5, 0.75].map((t) => (
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

      <polyline
        points={poly}
        fill="none"
        stroke="rgba(34,211,238,0.9)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {anomalies.map((a) => {
        const p = pts[a.index];
        if (!p) return null;
        const color =
          a.severity === "HIGH"
            ? "rgba(251,113,133,0.95)"
            : a.severity === "MEDIUM"
              ? "rgba(251,191,36,0.95)"
              : "rgba(52,211,153,0.95)";
        return (
          <g key={`${a.index}-${a.label}`}>
            <circle cx={p.x} cy={p.y} r="4.2" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

