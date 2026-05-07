"use client";

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

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatGeneratedAt(iso: string) {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  let hour = d.getHours();
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${m}/${day}/${y}, ${hour}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${ampm}`;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DEFAULT_SOURCES: DataSourcesSelection = {
  platformContent: true,
  userBehaviorLogs: false,
  moderationHistory: false,
  policyEnforcementLogs: false,
  externalThreatFeeds: true,
};

const DEFAULT_FILTERS: ResearchFilters = {
  dateRange: "7d",
  customStart: undefined,
  customEnd: undefined,
  region: "global",
  language: "all",
  contentType: "all",
  riskCategory: "all",
};

export default function Home() {
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState(
    "Why did hate speech spike last weekend? (last 7 days, global)",
  );
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeXRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoRefreshMs, setAutoRefreshMs] = useState(10_000);

  const charCountLabel = useMemo(
    () => `${query.length.toLocaleString()} / 2,000`,
    [query.length],
  );

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
    if (filters.dateRange === "custom") {
      if (filters.customStart) url.searchParams.set("customStart", filters.customStart);
      if (filters.customEnd) url.searchParams.set("customEnd", filters.customEnd);
    }
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
    runResearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    if (loading) return;
    const id = window.setTimeout(() => {
      runResearch({ silent: true });
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(sources), JSON.stringify(filters)]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      if (!snapshot) return;
      if (loading) return;
      runResearch({ silent: true });
    }, autoRefreshMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, loading, autoRefresh, autoRefreshMs]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && reportOpen) setReportOpen(false);
      if (e.key === "Escape" && settingsOpen) setSettingsOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reportOpen, settingsOpen]);

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

  const reportId = useMemo(() => {
    if (!snapshot?.explanation.updatedAt) return null;
    const ms = new Date(snapshot.explanation.updatedAt).getTime();
    return `GRD-${ms}`;
  }, [snapshot?.explanation.updatedAt]);

  const enabledSources = useMemo(() => {
    const out: string[] = [];
    if (sources.platformContent) out.push("Platform Content");
    if (sources.userBehaviorLogs) out.push("User Behavior Logs");
    if (sources.moderationHistory) out.push("Moderation History");
    if (sources.policyEnforcementLogs) out.push("Policy Enforcement Logs");
    if (sources.externalThreatFeeds) out.push("External Threat & Trend Feeds");
    return out;
  }, [sources]);

  function exportSnapshot() {
    if (!snapshot) return;
    const filename = `guardian-ai-export-${reportId ?? "latest"}.json`;
    downloadText(filename, JSON.stringify(snapshot, null, 2));
  }

  async function ingestExternalText(label: string, text: string) {
    const cleaned = text.trim().slice(0, 6000);
    if (!cleaned) return;
    setQuery((q) => {
      const next = `${q.trim()}\n\n[External Input: ${label}]\n${cleaned}\n`.slice(0, 2000);
      return next;
    });
    window.setTimeout(() => runResearch(), 0);
  }

  async function onUploadFilePicked(file: File) {
    const maxBytes = 300_000;
    if (file.size > maxBytes) {
      setError(`File too large (${Math.round(file.size / 1024)}KB). Max is ${Math.round(maxBytes / 1024)}KB.`);
      return;
    }
    const text = await file.text();
    await ingestExternalText(file.name, text);
  }

  async function addUrlFlow() {
    const url = window.prompt("Paste a URL to ingest");
    if (!url) return;
    try {
      setError(null);
      const res = await fetch(url);
      const txt = await res.text();
      await ingestExternalText(url, txt);
    } catch {
      await ingestExternalText(url, `URL: ${url}`);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1200px] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl border border-[var(--border)] bg-white grid place-items-center"
              aria-hidden="true"
              style={{ boxShadow: "var(--shadow)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2.2l8.2 4.7v10.2L12 21.8 3.8 17.1V6.9L12 2.2Z"
                  stroke="rgba(13,148,136,0.95)"
                  strokeWidth="1.8"
                />
                <path
                  d="M7.6 10.4c1.3-2.2 4.9-2.9 7.1-1.1 2.3 1.9 2.1 5.7-.6 7.2-2.7 1.5-6.1.1-6.9-2.4"
                  stroke="rgba(37,99,235,0.9)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-[-0.02em]">Guardian AI</div>
              <div className="text-[12px] text-[var(--text-muted)]">
                Research &amp; Analytics Dashboard
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2" aria-label="Utility">
            <button
              type="button"
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] px-2 py-2"
              onClick={() => setSettingsOpen(true)}
            >
              ⚙ Settings
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
              onClick={exportSnapshot}
              disabled={!snapshot}
              style={{
                background: "var(--navy)",
                transition: "background 0.25s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--navy-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)";
              }}
            >
              ⬇ Export Data
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-6 pb-12 space-y-6">
        {/* SECTION 1 — AI Research & Investigation Console */}
        <section className="rounded-[var(--radius)] overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <button
            type="button"
            className="w-full px-5 py-4 text-white flex items-start justify-between gap-4 flex-wrap text-left"
            onClick={() => setConsoleOpen((v) => !v)}
            aria-expanded={consoleOpen}
            style={{
              background: "linear-gradient(135deg, var(--navy) 0%, #0f2a6b 55%, var(--navy) 100%)",
            }}
          >
            <div className="flex items-start gap-3 min-w-[260px]">
              <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/20 grid place-items-center">
                <span className="text-white text-base" aria-hidden="true">
                  🔍
                </span>
              </div>
              <div>
                <div className="text-base font-bold">AI Research &amp; Investigation Console</div>
                <div className="mt-0.5 text-sm text-white/85 max-w-[68ch]">
                  Ask questions, upload data, and run AI-powered research across platform intelligence
                </div>
              </div>
            </div>
            <div
              className="h-9 w-9 rounded-full border border-white/15 bg-white/10 grid place-items-center"
              aria-hidden="true"
            >
              <span className="text-white/90 text-base font-bold">
                {consoleOpen ? "▴" : "▾"}
              </span>
            </div>
          </button>

          {consoleOpen ? (
            <div className="px-5 pb-5 pt-5">
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
                  className="w-full min-h-[150px] max-h-[320px] resize-y rounded-xl border border-[var(--border-soft)] bg-[var(--card-elevated)] px-4 py-4 pb-8 text-sm leading-relaxed outline-none focus:ring-2"
                  style={{ boxShadow: "inset 0 1px 0 rgba(15,23,42,0.03)" }}
                />
                <div className="absolute bottom-2 right-3 text-xs text-[var(--text-muted)]">
                  {charCountLabel}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] inline-flex items-center gap-2"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  <span aria-hidden="true">⏱</span> Research History
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] px-2 py-2"
                    onClick={() => setQuery("")}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
                    onClick={() => runResearch()}
                    disabled={loading || query.trim().length === 0}
                    style={{
                      background: "var(--navy)",
                      transition: "background 0.25s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--navy-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)";
                    }}
                  >
                    ▶ Run Research
                  </button>
                </div>
              </div>

              {showHistory && history.length ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {history.slice(0, 6).map((h, idx) => (
                    <button
                      key={`${h.at}-${idx}`}
                      type="button"
                      onClick={() => {
                        setQuery(h.query);
                        setMode(h.mode);
                      }}
                      className="text-left rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-4 py-3 hover:bg-white"
                    >
                      <div className="text-xs font-semibold text-[var(--text)] truncate">
                        {h.query || "(empty query)"}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {h.mode.toUpperCase()} · {fmtAgo(h.at)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-section)] p-4">
                  <div className="text-sm font-bold inline-flex items-center gap-2">
                    <span aria-hidden="true">🗄️</span> Data Sources for Research
                  </div>
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
                          className="h-[18px] w-[18px]"
                          style={{ accentColor: "var(--accent)" }}
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
                      onClick={() => fileInputRef.current?.click()}
                      >
                        ⬆ Upload File
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-[13px] font-semibold hover:bg-slate-50"
                      onClick={() => void addUrlFlow()}
                      >
                        🔗 Add URL
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      Supported: CSV, JSON, PDF, TXT, Logs, External URLs
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-section)] p-4">
                  <div className="text-sm font-bold inline-flex items-center gap-2">
                    <span aria-hidden="true">⛭</span> Research Filters
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                        Date Range
                      </label>
                      <select
                        value={filters.dateRange}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            dateRange: e.target.value as ResearchFilters["dateRange"],
                          }))
                        }
                        className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
                      >
                        <option value="24h">Last 24h</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {filters.dateRange === "custom" ? (
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={filters.customStart ?? ""}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, customStart: e.target.value || undefined }))
                            }
                            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={filters.customEnd ?? ""}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, customEnd: e.target.value || undefined }))
                            }
                            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
                          />
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                        Region
                      </label>
                      <select
                        value={filters.region}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            region: e.target.value as ResearchFilters["region"],
                          }))
                        }
                        className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
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
                          setFilters((f) => ({
                            ...f,
                            language: e.target.value as ResearchFilters["language"],
                          }))
                        }
                        className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
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
                          setFilters((f) => ({
                            ...f,
                            contentType: e.target.value as ResearchFilters["contentType"],
                          }))
                        }
                        className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
                      >
                        <option value="all">All</option>
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                        Risk Category
                      </label>
                      <select
                        value={filters.riskCategory}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            riskCategory: e.target.value as ResearchFilters["riskCategory"],
                          }))
                        }
                        className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
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
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.csv,.json,.md,text/plain,application/json,text/csv"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  void onUploadFilePicked(file);
                  e.currentTarget.value = "";
                }}
              />

              <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-sm font-bold inline-flex items-center gap-2">
                  <span aria-hidden="true">⚙</span> Research Mode
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {[
                    { key: "quick" as const, title: "Quick Insight", desc: "Fast summary, minimal depth" },
                    { key: "deep" as const, title: "Deep Research", desc: "Full model execution + correlations" },
                    { key: "predictive" as const, title: "Predictive Analysis", desc: "Forecast-focused results" },
                  ].map((m) => {
                    const active = mode === m.key;
                    return (
                      <label
                        key={m.key}
                        className={`block cursor-pointer rounded-xl border px-4 py-3 transition ${
                          active
                            ? "border-[var(--border-soft)] bg-[var(--bg-section)]"
                            : "border-[var(--border)] bg-white hover:bg-slate-50"
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
                        <div className="text-sm font-semibold">
                          {active ? "🔵 " : "⚪ "}
                          {m.title}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{m.desc}</div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* SECTION 2 — AI Insight Summary */}
        <section className="rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--bg-section)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div
                className="h-9 w-9 rounded-lg grid place-items-center text-white"
                style={{ background: "var(--navy)" }}
              >
                <span aria-hidden="true">🧠</span>
              </div>
              <div>
                <div className="text-lg font-bold">AI Insight Summary</div>
                <div className="text-sm text-[var(--text-muted)]">Intelligence Layer</div>
              </div>
            </div>
            <Badge tone="info">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
              Live
            </Badge>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4 text-sm leading-relaxed text-[var(--text)]">
            {explanation?.summary ??
              "Run research to generate a live, model-driven explanation for the current filters."}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-[var(--text-muted)] inline-flex items-center gap-3">
              {explanation ? (
                <>
                  <span className="inline-flex items-center gap-2">
                    Confidence:{" "}
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />{" "}
                    <span className="font-semibold text-[var(--text)]">{explanation.confidence}%</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    🕐 <span>{updatedLabel ?? "Updating…"}</span>
                  </span>
                </>
              ) : (
                <span>Loading…</span>
              )}
            </div>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
              onClick={() => setReportOpen(true)}
              disabled={!snapshot}
              style={{
                background: "var(--navy)",
                transition: "background 0.25s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--navy-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)";
              }}
            >
              📋 Generate Report
            </button>
          </div>
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
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Normal {topic.growth.normal}%
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
              <span className="rounded-full border border-[var(--border)] bg-[var(--card-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
                MODEL 5
              </span>
            </div>

            {graph ? (
              <>
              <div className="mt-2 flex flex-wrap items-center gap-5 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="font-semibold text-rose-600">
                    {graph.suspiciousClusters} Suspicious Clusters
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Coordinated Activity Detected
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                  Shared IP/Device Detected
                </span>
              </div>

              <div className="mt-4">
                  <CoordinationNetwork
                    nodes={graph.graph.nodes}
                    edges={graph.graph.edges}
                    seedKey={`${snapshot?.explanation.updatedAt ?? "seed"}::${query}`}
                  height={260}
                />
                </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {graph.insights.slice(0, 3).map((i) => (
                  <span
                    key={i}
                    className="rounded-full border border-[var(--border)] bg-[var(--card-muted)] px-3 py-1 text-xs font-semibold text-[var(--text)]"
                  >
                    {i}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> High Risk (≥70)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Medium Risk (40–69)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> Low Risk (&lt;40)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-500" /> Suspicious Node
                </span>
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
            <div
              className="px-5 py-4 border-b text-white flex items-start justify-between gap-4"
              style={{
                background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-hover) 100%)",
                borderColor: "rgba(203,213,225,0.25)",
              }}
            >
              <div>
                <div className="text-base font-bold inline-flex items-center gap-2">
                  <span aria-hidden="true">📄</span> Intelligence Report
                </div>
                <div className="text-xs text-white/85">
                  {snapshot?.explanation.updatedAt
                    ? `Generated ${formatGeneratedAt(snapshot.explanation.updatedAt)}`
                    : "No snapshot yet"}
                </div>
              </div>
              <button
                ref={closeXRef}
                type="button"
                aria-label="Close"
                className="h-[34px] w-[34px] rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                onClick={() => setReportOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <h2 id="report-title" className="m-0 text-lg font-bold">
                Guardian AI Intelligence Report
              </h2>

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                  <span className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 font-semibold">
                    Report Type: AI Insight Summary
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 font-semibold">
                    Generated:{" "}
                    {snapshot?.explanation.updatedAt
                      ? new Date(snapshot.explanation.updatedAt).toLocaleDateString()
                      : "—"}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 font-semibold">
                    Last Updated: {updatedLabel ?? "—"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-xs font-semibold text-[var(--navy)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                  Confidence: {snapshot?.explanation.confidence ?? "—"}%
                </span>
              </div>

              <div className="mt-5 text-sm font-bold">📋 Executive Summary</div>
              <div className="mt-2 rounded-xl border border-[var(--border)] bg-white p-4 text-sm leading-relaxed">
                {snapshot?.explanation.summary ??
                  "Run research to generate a report from live model outputs."}
              </div>

              {snapshot ? (
                <>
                  <div className="mt-5 text-sm font-bold">🔍 Key Findings</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {snapshot.explanation.reasoningBullets.slice(0, 3).map((b) => (
                      <div
                        key={b}
                        className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 font-bold" style={{ color: "var(--accent)" }} aria-hidden="true">
                            ↗
                          </span>
                          <span>{b}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 text-sm font-bold">🛡 Recommended Actions</div>
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <ul className="m-0 p-0 list-none space-y-2 text-sm">
                      {snapshot.explanation.recommendedActions.map((a) => (
                        <li key={a} className="flex items-start gap-2">
                          <span className="mt-0.5 font-bold text-amber-700">✓</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 text-xs text-[var(--text-muted)] space-y-1">
                    <div>
                      <span className="font-semibold">Data Sources:</span>{" "}
                      {enabledSources.length ? enabledSources.join(", ") : "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Models Used:</span> T5/Pegasus (Summarization), LSTM (Trends),
                      LDA/BERTopic (Topics), ML Classification (Health Scoring)
                    </div>
                    <div>
                      <span className="font-semibold">Confidence Level:</span>{" "}
                      {snapshot.explanation.confidence}% (High)
                    </div>
                    <div>
                      <span className="font-semibold">Report ID:</span> {reportId ?? "—"}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--card-muted)] flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-[var(--text-muted)] max-w-[360px]">
                ℹ This report is confidential and intended for authorized personnel only
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  onClick={() => setReportOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
                  disabled={!snapshot}
                  onClick={() => {
                    if (!snapshot) return;
                    const lines = [
                      "Guardian AI Intelligence Report",
                      `Report ID: ${reportId ?? "—"}`,
                      `Generated: ${
                        snapshot.explanation.updatedAt
                          ? formatGeneratedAt(snapshot.explanation.updatedAt)
                          : "—"
                      }`,
                      `Confidence: ${snapshot.explanation.confidence}%`,
                      "",
                      "Executive Summary:",
                      snapshot.explanation.summary,
                      "",
                      "Key Findings:",
                      ...snapshot.explanation.reasoningBullets.map((b) => `- ${b}`),
                      "",
                      "Recommended Actions:",
                      ...snapshot.explanation.recommendedActions.map((a) => `- ${a}`),
                      "",
                      `Data Sources: ${enabledSources.length ? enabledSources.join(", ") : "—"}`,
                    ];
                    downloadText(
                      `guardian-ai-report-${reportId ?? "latest"}.txt`,
                      lines.join("\n"),
                    );
                  }}
                  style={{
                    background: "var(--navy)",
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--navy-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)";
                  }}
                >
                  ⬇ Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div className="w-full max-w-[560px] rounded-[var(--radius)] glass overflow-hidden flex flex-col">
            <div
              className="px-5 py-4 border-b text-white flex items-start justify-between gap-4"
              style={{
                background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-hover) 100%)",
                borderColor: "rgba(203,213,225,0.25)",
              }}
            >
              <div>
                <div id="settings-title" className="text-base font-bold">
                  Settings
                </div>
                <div className="text-xs text-white/85">Dashboard behavior</div>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="h-[34px] w-[34px] rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card-elevated)] px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">Auto refresh</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Periodically refresh charts while the page is open
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                  className="h-[18px] w-[18px]"
                />
              </label>

              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--card-elevated)] px-4 py-3">
                <div className="text-sm font-semibold text-[var(--text)]">Refresh interval</div>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={autoRefreshMs}
                    onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:ring-2"
                  >
                    <option value={5_000}>Every 5s</option>
                    <option value={10_000}>Every 10s</option>
                    <option value={30_000}>Every 30s</option>
                    <option value={60_000}>Every 60s</option>
                  </select>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60 transition"
                    style={{
                      background: "var(--navy)",
                      transition: "background 0.25s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--navy-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)";
                    }}
                    onClick={() => runResearch()}
                    disabled={loading}
                  >
                    Refresh now
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[var(--border-soft)] bg-[var(--bg-section)] flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                onClick={() => setSettingsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
