"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Node = { id: string; risk_score: number };
type Edge = { source: string; target: string };

type PositionedNode = Node & { x: number; y: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function seeded(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function riskColor(risk: number) {
  if (risk >= 70) return "rgba(251,113,133,0.92)";
  if (risk >= 40) return "rgba(251,191,36,0.9)";
  return "rgba(52,211,153,0.85)";
}

export function CoordinationNetwork({
  nodes,
  edges,
  seedKey,
  height = 240,
}: {
  nodes: Node[];
  edges: Edge[];
  seedKey: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(520);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    function onResize() {
      const w = containerRef.current?.clientWidth ?? 520;
      setWidth(Math.max(320, w));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    {},
  );

  const positioned = useMemo(() => {
    const rand = seeded(seedKey);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    const out: PositionedNode[] = nodes.map((n, i) => {
      const ang = (i / Math.max(1, nodes.length)) * Math.PI * 2 + rand() * 0.6;
      const r = radius * (0.65 + rand() * 0.35);
      const base = { x: centerX + Math.cos(ang) * r, y: centerY + Math.sin(ang) * r };
      const p = positions[n.id] ?? base;
      return { ...n, x: p.x, y: p.y };
    });

    return out;
  }, [nodes, positions, seedKey, width, height]);

  const byId = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    for (const n of positioned) m.set(n.id, n);
    return m;
  }, [positioned]);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Coordination network graph"
        className="block"
        style={{
          background: "var(--card-muted)",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
        onPointerMove={(e) => {
          if (!draggingId) return;
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * width;
          const y = ((e.clientY - rect.top) / rect.height) * height;
          setPositions((prev) => ({
            ...prev,
            [draggingId]: { x: clamp(x, 10, width - 10), y: clamp(y, 10, height - 10) },
          }));
        }}
        onPointerUp={() => setDraggingId(null)}
        onPointerLeave={() => setDraggingId(null)}
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(37,99,235,0.18)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0)" />
          </radialGradient>
        </defs>

        {edges.slice(0, 120).map((e, idx) => {
          const a = byId.get(e.source);
          const b = byId.get(e.target);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.source}-${e.target}-${idx}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgba(100,116,139,0.22)"
              strokeWidth="1"
            />
          );
        })}

        {positioned.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="16" fill="url(#nodeGlow)" />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.id === draggingId ? 7 : 6}
              fill={riskColor(n.risk_score)}
              stroke="rgba(15,23,42,0.18)"
              strokeWidth="1"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDraggingId(n.id);
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

