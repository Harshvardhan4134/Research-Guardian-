"use client";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function points(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  return values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (width - 2) + 1;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return { x, y: clamp(y, 1, height - 1) };
  });
}

export function ForecastChart({
  actual,
  predicted,
  bandUpper,
  bandLower,
  height = 160,
}: {
  actual: number[];
  predicted: number[];
  bandUpper: number[];
  bandLower: number[];
  height?: number;
}) {
  const width = 520;
  const ptsA = points(actual, width, height);
  const ptsP = points(predicted, width, height);
  const ptsU = points(bandUpper, width, height);
  const ptsL = points(bandLower, width, height);

  const bandPath =
    `M ${ptsL.map((p) => `${p.x} ${p.y}`).join(" L ")} ` +
    `L ${ptsU
      .slice()
      .reverse()
      .map((p) => `${p.x} ${p.y}`)
      .join(" L ")} Z`;

  const grid = "rgba(148,163,184,0.18)";

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Forecast Engine chart"
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

      <path d={bandPath} fill="rgba(167,139,250,0.16)" stroke="none" />

      <polyline
        points={ptsA.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="rgba(34,211,238,0.92)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <polyline
        points={ptsP.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="rgba(167,139,250,0.95)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="6 5"
      />
    </svg>
  );
}

