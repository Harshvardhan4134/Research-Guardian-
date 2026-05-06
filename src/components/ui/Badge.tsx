"use client";

import { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<typeof tone, string> = {
    neutral:
      "border-[var(--border)] bg-white/5 text-[var(--text)]",
    success:
      "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    warning:
      "border-amber-400/25 bg-amber-400/10 text-amber-200",
    danger: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    info: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

