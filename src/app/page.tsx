"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { AnomalyChart } from "@/components/charts/AnomalyChart";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { CoordinationNetwork } from "@/components/network/CoordinationNetwork";
import type {
  DataSourcesSelection,
  ResearchFilters,
  ResearchMode,
  ResearchSnapshot,
} from "@/lib/researchTypes";

function fmtAgo(iso: string) {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `Updated ${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `Updated ${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  return `Updated ${h} hour${h === 1 ? "" : "s"} ago`;
}

function severityTone(s: "LOW" | "MEDIUM" | "HIGH") {
  if (s === "HIGH") return "danger";
  if (s === "MEDIUM") return "warning";
  return "success";
}

function riskTone(score: number) {
  if (score >= 75) return "danger";
  if (score >= 50) return "warning";
  return "success";
}

const DEFAULT_SOURCES: DataSourcesSelection = {
  platformContent: true,
  userBehaviorLogs: true,
  moderationHistory: true,
  policyEnforcementLogs: true,
  externalThreatFeeds: true,
};

const DEFAULT_FILTERS: ResearchFilters = {
  dateRange: "7d",
  region: "global",
  language: "all",
  contentType: "all",
  riskCategory: "all",
};

export default function Home() {
  const [query, setQuery] = useState("Guardian AI dashboard health snapshot");
  const [mode, setMode] = useState<ResearchMode>("quick");
  const [sources, setSources] = useState<DataSourcesSelection>(DEFAULT_SOURCES);
  const [filters, setFilters] = useState<ResearchFilters>(DEFAULT_FILTERS);

  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const closeXRef = useRef<HTMLButtonElement | null>(null);

  const updatedLabel = useMemo(() => {
    if (!snapshot?.explanation.updatedAt) return null;
    return fmtAgo(snapshot.explanation.updatedAt);
  }, [snapshot?.explanation.updatedAt]);

  function buildUrl() {
    const url = new URL("/api/run-research", window.location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("mode", mode);
    url.searchParams.set("src_platform", sources.platformContent ? "1" : "0");
    url.searchParams.set("src_behavior", sources.userBehaviorLogs ? "1" : "0");
    url.searchParams.set("src_moderation", sources.moderationHistory ? "1" : "0");
    url.searchParams.set(
      "src_policy",
      sources.policyEnforcementLogs ? "1" : "0",
    );
    url.searchParams.set("src_external", sources.externalThreatFeeds ? "1" : "0");
    url.searchParams.set("dateRange", filters.dateRange);
    url.searchParams.set("region", filters.region);
    url.searchParams.set("language", filters.language);
    url.searchParams.set("contentType", filters.contentType);
    url.searchParams.set("riskCategory", filters.riskCategory);
    return url.toString();
  }

  async function runResearch(opts?: { silent?: boolean }) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as ResearchSnapshot;
      setSnapshot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run research");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runResearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!snapshot) return;
      if (loading) return;
      runResearch({ silent: true });
    }, 10_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, loading, mode, query, JSON.stringify(sources), JSON.stringify(filters)]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && reportOpen) setReportOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reportOpen]);

  useEffect(() => {
    if (reportOpen) closeXRef.current?.focus();
  }, [reportOpen]);

  const explanation = snapshot?.explanation;
  const topic = snapshot?.topicIntelligence;
  const anomalies = snapshot?.anomalyDetection;
  const forecast = snapshot?.forecast;
  const risk = snapshot?.riskDistribution;
  const graph = snapshot?.graphNetwork;
  const health = snapshot?.systemHealth;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1200px] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Image
              src="/guardian-logo.png"
              alt="Guardian AI logo"
              width={170}
              height={52}
              priority
              className="h-[40px] w-auto"
            />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-[-0.02em]">GUARDIAN AI</div>
              <div className="text-[12px] text-[var(--text-muted)]">
                Where Safety Meets Technology
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2" aria-label="Utility">
            <button
              type="button"
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] px-2 py-2"
              onClick={() => setReportOpen(true)}
            >
              Settings
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              onClick={() => setReportOpen(true)}
              disabled={!snapshot}
            >
              Export Data
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-6 pb-12 space-y-6">
        <section className="glass rounded-[var(--radius)] p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              {explanation ? (
                <>
                  <span className="font-semibold text-[var(--text)]">
                    Confidence: {explanation.confidence}%
                  </span>
                  <span>•</span>
                  <span>{updatedLabel ?? "Updating…"}</span>
                </>
              ) : (
                <span>Loading intelligence snapshot…</span>
              )}
            </div>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              onClick={() => runResearch()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Generate Report"}
            </button>
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="glass rounded-[var(--radius)] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-bold">Topic Intelligence</div>
              <div className="text-sm text-[var(--text-muted)]">
                Model 2 · {topic?.subtitle ?? "Powered by Clustering AI"}
              </div>
            </div>
            {topic ? (
              <Badge tone="info">Model 2 · Confidence {topic.confidence}%</Badge>
            ) : null}
          </div>

          {topic ? (
            <>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Hate +{topic.growth.hate}%
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Misinfo +{topic.growth.misinfo}%
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-400" /> Scams +{topic.growth.scams}%
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Normal {topic.growth.normal}%
                </span>
              </div>

              <div className="mt-3">
                <MultiLineChart
                  series={[
                    {
                      key: "hate",
                      label: "Hate Speech",
                      color: "rgba(251,113,133,0.95)",
                      values: topic.series.hate_speech,
                    },
                    {
                      key: "misinfo",
                      label: "Misinformation",
                      color: "rgba(251,191,36,0.95)",
                      values: topic.series.misinformation,
                    },
                    {
                      key: "scams",
                      label: "Scams",
                      color: "rgba(167,139,250,0.95)",
                      values: topic.series.scams,
                    },
                    {
                      key: "normal",
                      label: "Normal",
                      color: "rgba(52,211,153,0.92)",
                      values: topic.series.normal,
                    },
                  ]}
                  height={180}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {topic.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-semibold rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[var(--text)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm text-[var(--text-muted)]">
              Waiting for Topic Intelligence signals…
            </div>
          )}
        </section>

        <section className="glass rounded-[var(--radius)] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-bold">Anomaly Detection</div>
              <div className="text-sm text-[var(--text-muted)]">
                Model 3 · {anomalies?.subtitle ?? "Powered by Risk Detection"}
              </div>
            </div>
            {anomalies ? (
              <Badge tone={severityTone(anomalies.severity)}>
                {anomalies.totalAnomalies} anomalies · {anomalies.severity}
              </Badge>
            ) : null}
          </div>

          {anomalies ? (
            <>
              <div className="mt-4">
                <AnomalyChart values={anomalies.series.activity} anomalies={anomalies.series.anomalies} height={180} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Anomaly markers
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-600" /> Activity line
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm text-[var(--text-muted)]">
              Waiting for anomaly stream…
            </div>
          )}
        </section>

        <section className="glass rounded-[var(--radius)] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-bold">Forecast Engine</div>
              <div className="text-sm text-[var(--text-muted)]">
                Model 4 · {forecast?.subtitle ?? "Powered by Temporal AI"}
              </div>
            </div>
            {forecast ? <Badge tone="info">Confidence {forecast.confidence}%</Badge> : null}
          </div>

          {forecast ? (
            <>
              <div className="mt-4">
                <ForecastChart
                  actual={forecast.series.actual}
                  predicted={forecast.series.predicted}
                  bandUpper={forecast.series.bandUpper}
                  bandLower={forecast.series.bandLower}
                  height={180}
                />
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm text-[var(--text-muted)]">
              Waiting for forecast signals…
            </div>
          )}
        </section>

        <section className="glass rounded-[var(--radius)] p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-bold">Risk Distribution</div>
              <div className="text-sm text-[var(--text-muted)]">
                Aggregated signals · Normalized 0–100
              </div>
              </div>
            <Badge tone="info">Multi-model</Badge>
            </div>

            {risk ? (
              <div className="mt-4 space-y-3">
                {risk.items.map((it) => (
                  <div
                    key={it.key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{it.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{it.value} · Model {it.modelSource}</div>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${it.value}%`,
                          background:
                            it.value >= 75
                              ? "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(251,113,133,0.55))"
                              : it.value >= 50
                                ? "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(251,191,36,0.55))"
                                : "linear-gradient(90deg, rgba(52,211,153,0.92), rgba(52,211,153,0.55))",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm text-[var(--text-muted)]">
              Waiting for risk distribution…
              </div>
            )}
        </section>

        <section className="glass rounded-[var(--radius)] p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-bold">Coordination Network</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Model 5 · {graph?.subtitle ?? "Powered by Graph Intelligence"}
                </div>
              </div>
              {graph ? (
                <Badge tone="warning">⚠ {graph.suspiciousClusters} suspicious clusters</Badge>
              ) : null}
            </div>

            {graph ? (
              <>
              <div className="mt-4">
                  <CoordinationNetwork
                    nodes={graph.graph.nodes}
                    edges={graph.graph.edges}
                    seedKey={`${snapshot?.explanation.updatedAt ?? "seed"}::${query}`}
                  height={260}
                />
                </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> High risk
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Medium risk
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Safe
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {graph.insights.map((i) => (
                    <div
                      key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-3.5 py-3 text-sm"
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </>
            ) : (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm text-[var(--text-muted)]">
              Waiting for coordination network…
              </div>
            )}
        </section>

        <section className="glass rounded-[var(--radius)] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-bold">System Health &amp; Model Status</div>
              <div className="text-sm text-[var(--text-muted)]">
                {health?.subtitle ?? "Real-time model performance monitoring"}
              </div>
            </div>
            {health ? <Badge tone="success">{health.overallStatus}</Badge> : null}
          </div>

          {health ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {health.models.map((m) => {
                const top =
                  m.id === 1
                    ? "#10b981"
                    : m.id === 2
                      ? "#2563eb"
                      : m.id === 3
                        ? "#ef4444"
                        : m.id === 4
                          ? "#7c3aed"
                          : m.id === 5
                            ? "#0d9488"
                            : "#64748b";

                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
                    style={{ boxShadow: "var(--shadow)" }}
                  >
                    <div
                      className="h-1.5 w-full rounded-full"
                      style={{ background: top }}
                      aria-hidden="true"
                    />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Model {m.id}
                        </div>
                        <div className="text-sm font-semibold">{m.name}</div>
                        <div className="mt-1 text-xs text-[var(--text-faint)]">{m.tech}</div>
                      </div>
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        <div>
                          Accuracy <span className="font-semibold text-[var(--text)]">{m.accuracy}%</span>
                        </div>
                        <div>
                          Latency <span className="font-semibold text-[var(--text)]">{m.latencyMs}ms</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Badge tone="neutral">Drift {m.drift}</Badge>
                      <Badge tone={riskTone(m.stability === "High" ? 20 : m.stability === "Medium" ? 60 : 85)}>
                        Stability {m.stability}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm text-[var(--text-muted)]">
              Waiting for system health…
            </div>
          )}
        </section>
      </main>

      {reportOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReportOpen(false);
          }}
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div className="w-full max-w-[720px] max-h-[min(92vh,820px)] rounded-[var(--radius)] glass overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border)] bg-black/25 flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-bold">Intelligence Report</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {snapshot ? fmtAgo(snapshot.explanation.updatedAt) : "No snapshot yet"}
                </div>
              </div>
              <button
                ref={closeXRef}
                type="button"
                aria-label="Close"
                className="h-[34px] w-[34px] rounded-lg border border-[var(--border)] bg-white/5 hover:bg-white/10 text-[var(--text)] flex items-center justify-center"
                onClick={() => setReportOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <h2 id="report-title" className="m-0 text-lg font-bold">
                Guardian AI Intelligence Report
              </h2>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                <Badge tone="neutral">Report Type: AI Insight Summary</Badge>
                <Badge tone="info">Mode: {mode.toUpperCase()}</Badge>
                {snapshot ? (
                  <Badge tone="success">Confidence: {snapshot.explanation.confidence}%</Badge>
                ) : null}
              </div>

              <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Executive Summary
              </div>
              <div className="mt-2 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm leading-relaxed">
                {snapshot?.explanation.summary ??
                  "Run research to generate a report from live model outputs."}
              </div>

              {snapshot ? (
                <>
                  <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Key Findings (Model Sources)
                  </div>
                  <div className="mt-2 space-y-2">
                    {snapshot.explanation.reasoningBullets.map((b) => (
                      <div
                        key={b}
                        className="rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3 text-sm"
                      >
                        {b}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Recommended Actions
                  </div>
                  <div className="mt-2 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4">
                    <ul className="m-0 p-0 list-none space-y-2 text-sm">
                      {snapshot.explanation.recommendedActions.map((a) => (
                        <li key={a} className="flex items-start gap-2">
                          <span className="mt-0.5 font-bold text-amber-200">✓</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-[var(--border)] bg-black/25 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-[var(--text-muted)] max-w-[360px]">
                This report is confidential and intended for authorized personnel only.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                  onClick={() => setReportOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60"
                  disabled={!snapshot}
                >
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
