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
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ResearchMode>("quick");
  const [sources, setSources] = useState<DataSourcesSelection>(DEFAULT_SOURCES);
  const [filters, setFilters] = useState<ResearchFilters>(DEFAULT_FILTERS);

  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    { query: string; mode: ResearchMode; at: string }[]
  >([]);

  const [reportOpen, setReportOpen] = useState(false);
  const closeXRef = useRef<HTMLButtonElement | null>(null);

  const charCountLabel = useMemo(
    () => `${query.length.toLocaleString()} / 2,000`,
    [query.length],
  );

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
      if (!opts?.silent) {
        setHistory((h) => [
          { query: data.request.query, mode: data.request.mode, at: data.explanation.updatedAt },
          ...h,
        ].slice(0, 12));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run research");
    } finally {
      setLoading(false);
    }
  }

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
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-black/25 backdrop-blur-xl">
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
              onClick={() => setHistory([])}
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
        <section className="rounded-[var(--radius)] overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div
            className="px-5 py-4 text-white flex items-start justify-between gap-4 flex-wrap"
            style={{
              background:
                "linear-gradient(135deg, #0b1220 0%, #0f2a6b 50%, #0b1220 100%)",
            }}
          >
            <div className="min-w-[240px]">
              <div className="text-lg font-bold">AI Research &amp; Investigation Console</div>
              <div className="mt-1 text-sm text-[var(--text-muted)] max-w-[52ch]">
                Ask questions, upload data, and run AI-powered research across platform intelligence.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-sm font-medium text-white/80 hover:text-white px-2 py-2"
                onClick={() => setQuery("")}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
                onClick={() => runResearch()}
                disabled={loading}
              >
                {loading ? "Running…" : "Run Research"}
              </button>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="relative">
              <label htmlFor="research-input" className="visually-hidden">
                Research question
              </label>
              <textarea
                id="research-input"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 2000))}
                placeholder={
                  "Examples:\n- Why did hate speech spike last weekend?\n- Analyze misinformation trends around elections (last 30 days)\n- Identify emerging scam or fraud patterns\n- Predict risk growth for political content next week"
                }
                className="w-full min-h-[150px] max-h-[320px] resize-y rounded-xl border border-[var(--border)] bg-white px-4 py-4 pb-8 text-sm leading-relaxed outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
              <div className="absolute bottom-2 right-3 text-xs text-[var(--text-muted)]">
                {charCountLabel}
              </div>
            </div>

            {error ? (
              <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4">
                <div className="text-sm font-bold">Data Sources for Research</div>
                <div className="mt-3 space-y-2 text-sm text-[var(--text)]">
                  {[
                    { key: "platformContent", label: "Platform Content" },
                    { key: "userBehaviorLogs", label: "User Behavior Logs" },
                    { key: "moderationHistory", label: "Moderation History" },
                    { key: "policyEnforcementLogs", label: "Policy Enforcement Logs" },
                    { key: "externalThreatFeeds", label: "External Threat & Trend Feeds" },
                  ].map((row) => (
                    <label key={row.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sources[row.key as keyof DataSourcesSelection]}
                        onChange={(e) =>
                          setSources((s) => ({ ...s, [row.key]: e.target.checked }))
                        }
                        className="h-[18px] w-[18px] accent-blue-600"
                      />
                      <span className="text-[var(--text)]">{row.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    External Data Input
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-[13px] font-semibold hover:bg-slate-50"
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-[13px] font-semibold hover:bg-slate-50"
                    >
                      Add URL
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    Supported: CSV, JSON, PDF, TXT, Logs, External URLs
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4">
                <div className="text-sm font-bold">Research Filters</div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                      Date Range
                    </label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, dateRange: e.target.value as ResearchFilters["dateRange"] }))
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-black/25 px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      style={{ background: "white" }}
                    >
                      <option value="24h">Last 24h</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                      Region
                    </label>
                    <select
                      value={filters.region}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, region: e.target.value as ResearchFilters["region"] }))
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-black/25 px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      style={{ background: "white" }}
                    >
                      <option value="global">Global</option>
                      <option value="north-america">North America</option>
                      <option value="europe">Europe</option>
                      <option value="asia">Asia</option>
                      <option value="africa">Africa</option>
                      <option value="latin-america">Latin America</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                      Language
                    </label>
                    <select
                      value={filters.language}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, language: e.target.value as ResearchFilters["language"] }))
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-black/25 px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      style={{ background: "white" }}
                    >
                      <option value="all">All</option>
                      <option value="english">English</option>
                      <option value="spanish">Spanish</option>
                      <option value="french">French</option>
                      <option value="arabic">Arabic</option>
                      <option value="mandarin">Mandarin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                      Content Type
                    </label>
                    <select
                      value={filters.contentType}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, contentType: e.target.value as ResearchFilters["contentType"] }))
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-black/25 px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      style={{ background: "white" }}
                    >
                      <option value="all">All</option>
                      <option value="text">Text</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                      Risk Category
                    </label>
                    <select
                      value={filters.riskCategory}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, riskCategory: e.target.value as ResearchFilters["riskCategory"] }))
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-black/25 px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      style={{ background: "white" }}
                    >
                      <option value="all">All</option>
                      <option value="hate-speech">Hate Speech</option>
                      <option value="misinformation">Misinformation</option>
                      <option value="scams">Scams</option>
                      <option value="political">Political</option>
                      <option value="violence">Violence</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-sm font-bold">Research Mode</div>
                <div className="mt-3 space-y-2">
                  {[
                    { key: "quick" as const, title: "Quick Insight", desc: "Fast summary, minimal depth" },
                    { key: "deep" as const, title: "Deep Research", desc: "Full model execution + correlations" },
                    { key: "predictive" as const, title: "Predictive Analysis", desc: "Forecast-focused results" },
                  ].map((m) => {
                    const active = mode === m.key;
                    return (
                      <label
                        key={m.key}
                        className={`block cursor-pointer rounded-xl border px-3.5 py-3 transition ${
                          active ? "border-emerald-200 bg-emerald-50" : "border-[var(--border)] bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          value={m.key}
                          checked={mode === m.key}
                          onChange={() => setMode(m.key)}
                          className="sr-only"
                        />
                        <div className="text-sm font-semibold">{m.title}</div>
                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{m.desc}</div>
                      </label>
                    );
                  })}
                </div>

                {history.length ? (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Research History
                    </div>
                    <div className="mt-2 space-y-2">
                      {history.slice(0, 4).map((h, idx) => (
                        <button
                          key={`${h.at}-${idx}`}
                          type="button"
                          onClick={() => {
                            setQuery(h.query);
                            setMode(h.mode);
                          }}
                          className="w-full text-left rounded-lg border border-[var(--border)] bg-white px-3 py-2 hover:bg-slate-50"
                        >
                          <div className="text-xs font-semibold text-[var(--text)] truncate">
                            {h.query || "(empty query)"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                            {h.mode.toUpperCase()} · {fmtAgo(h.at)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="glass rounded-[var(--radius)] p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-bold">AI Insight Summary</div>
              <div className="text-sm text-[var(--text-muted)]">Intelligence Layer</div>
            </div>
            <Badge tone="info">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Live
            </Badge>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm leading-relaxed">
            {explanation?.summary ??
              "Run research to generate a live, model-driven explanation for the current filters."}
          </div>

          {explanation ? (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 rounded-xl border border-[var(--border)] bg-white/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Why (Model 6 – RAG)
                </div>
                <ul className="mt-2 space-y-2 text-sm">
                  {explanation.reasoningBullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300/80" aria-hidden="true" />
                      <span className="text-[var(--text)]">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-5 rounded-xl border border-[var(--border)] bg-white/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Recommended Actions
                </div>
                <ul className="mt-2 space-y-2 text-sm">
                  {explanation.recommendedActions.slice(0, 4).map((a) => (
                    <li key={a} className="flex items-start gap-2">
                      <span className="mt-0.5 font-bold text-emerald-300">✓</span>
                      <span className="text-[var(--text)]">{a}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-xs text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text)]">
                    Confidence: {explanation.confidence}%
                  </span>
                  <span>{fmtAgo(explanation.updatedAt)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="glass rounded-[var(--radius)] p-5 lg:col-span-7">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-bold">Topic Intelligence</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Model 2 · {topic?.subtitle ?? "Powered by Clustering AI"}
                </div>
              </div>
              {topic ? (
                <Badge tone="info">
                  Model 2 · Confidence {topic.confidence}%
                </Badge>
              ) : null}
            </div>

            {topic ? (
              <>
                <div className="mt-4">
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
                        key: "normal",
                        label: "Normal",
                        color: "rgba(52,211,153,0.92)",
                        values: topic.series.normal,
                      },
                      {
                        key: "scams",
                        label: "Scams",
                        color: "rgba(167,139,250,0.95)",
                        values: topic.series.scams,
                      },
                    ]}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="danger">Hate +{topic.growth.hate}%</Badge>
                  <Badge tone="warning">Misinfo +{topic.growth.misinfo}%</Badge>
                  <Badge tone="info">Scams +{topic.growth.scams}%</Badge>
                  <Badge tone="success">Normal {topic.growth.normal}%</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {topic.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs font-semibold rounded-full border border-[var(--border)] bg-black/25 px-2.5 py-1 text-[var(--text)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm text-[var(--text-muted)]">
                Run research to populate the Topic Intelligence graph.
              </div>
            )}
          </div>

          <div className="glass rounded-[var(--radius)] p-5 lg:col-span-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-bold">Anomaly Detection</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Model 3 · {anomalies?.subtitle ?? "Powered by Risk Detection"}
                </div>
              </div>
              {anomalies ? (
                <Badge tone={severityTone(anomalies.severity)}>
                  ⚠ {anomalies.totalAnomalies} anomalies · {anomalies.severity}
                </Badge>
              ) : null}
            </div>

            {anomalies ? (
              <>
                <div className="mt-4">
                  <AnomalyChart
                    values={anomalies.series.activity}
                    anomalies={anomalies.series.anomalies}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {anomalies.series.anomalies.slice(0, 4).map((a) => (
                    <span
                      key={`${a.index}-${a.label}`}
                      className="text-xs font-semibold rounded-full border border-[var(--border)] bg-black/25 px-2.5 py-1"
                    >
                      {a.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm text-[var(--text-muted)]">
                Run research to populate the anomaly stream.
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="glass rounded-[var(--radius)] p-5 lg:col-span-7">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-bold">Forecast Engine</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Model 4 · {forecast?.subtitle ?? "Powered by Temporal AI"}
                </div>
              </div>
              {forecast ? (
                <Badge tone="info">Confidence {forecast.confidence}%</Badge>
              ) : null}
            </div>

            {forecast ? (
              <>
                <div className="mt-4">
                  <ForecastChart
                    actual={forecast.series.actual}
                    predicted={forecast.series.predicted}
                    bandUpper={forecast.series.bandUpper}
                    bandLower={forecast.series.bandLower}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="danger">📈 +{forecast.riskIncreasePercent}% risk increase</Badge>
                  <Badge tone="warning">🎯 Peak: {forecast.peakDayLabel}</Badge>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm text-[var(--text-muted)]">
                Run research to populate forecast results.
              </div>
            )}
          </div>

          <div className="glass rounded-[var(--radius)] p-5 lg:col-span-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-bold">Risk Distribution</div>
                <div className="text-sm text-[var(--text-muted)]">Multi-Model · Normalized 0–100</div>
              </div>
            </div>

            {risk ? (
              <div className="mt-4 space-y-3">
                {risk.items.map((it) => (
                  <div
                    key={it.key}
                    className="rounded-xl border border-[var(--border)] bg-black/25 px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{it.label}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {it.value}
                        {it.trend === "up" ? "↑" : "↓"} · Model {it.modelSource}
                      </div>
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
                    <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                      {it.value >= 75
                        ? "High Risk (≥75)"
                        : it.value >= 50
                          ? "Medium Risk (50–74)"
                          : "Safe (<50)"}{" "}
                      · {it.trend === "up" ? "Trending up" : "Trending down"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm text-[var(--text-muted)]">
                Run research to populate risk distribution.
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="glass rounded-[var(--radius)] p-5 lg:col-span-7">
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
                  />
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {graph.insights.map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[var(--border)] bg-black/25 px-3.5 py-3 text-sm"
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm text-[var(--text-muted)]">
                Run research to populate the coordination network.
              </div>
            )}
          </div>

          <div className="glass rounded-[var(--radius)] p-5 lg:col-span-5">
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
              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
                <div className="bg-black/25">
                  {health.models.map((m) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--border)] last:border-b-0"
                    >
                      <div className="col-span-6">
                        <div className="text-sm font-semibold">Model {m.id}</div>
                        <div className="text-xs text-[var(--text-muted)]">{m.name}</div>
                        <div className="text-xs text-[var(--text-faint)] mt-1">{m.tech}</div>
                      </div>
                      <div className="col-span-6 flex flex-col items-end justify-center gap-1">
                        <div className="text-xs text-[var(--text-muted)]">
                          Accuracy <span className="text-[var(--text)] font-semibold">{m.accuracy}%</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Latency <span className="text-[var(--text)] font-semibold">{m.latencyMs}ms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone="neutral">Drift {m.drift}</Badge>
                          <Badge tone={riskTone(m.stability === "High" ? 20 : m.stability === "Medium" ? 60 : 85)}>
                            Stability {m.stability}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/25 p-4 text-sm text-[var(--text-muted)]">
                Run research to load system health signals.
              </div>
            )}
          </div>
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
