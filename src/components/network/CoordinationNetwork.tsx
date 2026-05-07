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
  const rafRef = useRef<number | null>(null);

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
  const positionsRef = useRef(positions);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Smoothed positions (easing + gentle drift) for a "cooler" feel.
  const [smooth, setSmooth] = useState<Record<string, { x: number; y: number }>>(
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
      const target = positions[n.id] ?? base;
      const p = smooth[n.id] ?? target;
      return { ...n, x: p.x, y: p.y };
    });

    return out;
  }, [nodes, positions, seedKey, width, height, smooth]);

  const byId = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    for (const n of positioned) m.set(n.id, n);
    return m;
  }, [positioned]);

  // Animation loop: ease smooth positions toward targets, plus subtle drift.
  useEffect(() => {
    let mounted = true;
    const rand = seeded(`smooth::${seedKey}`);
    const offsets = new Map<string, { ox: number; oy: number; phase: number }>();
    for (const n of nodes) {
      offsets.set(n.id, {
        ox: (rand() - 0.5) * 6,
        oy: (rand() - 0.5) * 6,
        phase: rand() * Math.PI * 2,
      });
    }

    const start = performance.now();
    const tick = () => {
      if (!mounted) return;
      const t = (performance.now() - start) / 1000;
      const easing = draggingId ? 0.35 : 0.12;
      const driftAmp = draggingId ? 0 : 1.6;

      setSmooth((prev) => {
        const next: Record<string, { x: number; y: number }> = { ...prev };
        for (const n of nodes) {
          const meta = offsets.get(n.id);
          const target = positionsRef.current[n.id];
          if (!target) continue;
          const base = prev[n.id] ?? target;
          const dx = target.x - base.x;
          const dy = target.y - base.y;
          const driftX = meta ? Math.sin(t * 1.2 + meta.phase) * driftAmp + meta.ox * 0.15 : 0;
          const driftY = meta ? Math.cos(t * 1.0 + meta.phase) * driftAmp + meta.oy * 0.15 : 0;
          next[n.id] = {
            x: base.x + dx * easing + driftX,
            y: base.y + dy * easing + driftY,
          };
        }
        return next;
      });

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [draggingId, nodes, seedKey]);

  // Seed initial target positions so smoothing has something to chase.
  useEffect(() => {
    if (nodes.length === 0) return;
    setPositions((prev) => {
      if (Object.keys(prev).length) return prev;
      const rand = seeded(`init::${seedKey}`);
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.38;
      const next: Record<string, { x: number; y: number }> = {};
      nodes.forEach((n, i) => {
        const ang = (i / Math.max(1, nodes.length)) * Math.PI * 2 + rand() * 0.6;
        const r = radius * (0.65 + rand() * 0.35);
        next[n.id] = { x: centerX + Math.cos(ang) * r, y: centerY + Math.sin(ang) * r };
      });
      return next;
    });
  }, [nodes, seedKey, width, height]);

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
          background: "var(--card)",
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
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="1.1"
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

