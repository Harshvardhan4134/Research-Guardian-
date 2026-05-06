"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type ResearchMode = "quick" | "deep" | "predictive";

function IconMagnifier() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function IconTealBrain() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 18v-3" />
      <path d="M9.8 13.9a4 4 0 012.2-8.9 4 4 0 012.2 8.9" />
      <path d="M6.9 15.3A3.5 3.5 0 016 12c0-1.1.5-2.1 1.4-2.8" />
      <path d="M17.1 9.2A3.5 3.5 0 0118 12c0 1.6-1 2.9-2.5 3.5" />
      <path d="M8 12h8" opacity="0.9" />
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
      <path d="M10 17.5h4" opacity="0.85" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M12 5l7 7-7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MODAL_GENERATED = "Generated 3/7/2026, 4:10:09 PM";

export default function Home() {
  const [consoleExpanded, setConsoleExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ResearchMode>("quick");
  const [reportOpen, setReportOpen] = useState(false);
  const closeXRef = useRef<HTMLButtonElement | null>(null);

  const charCount = query.length;
  const charCountLabel = useMemo(
    () => `${charCount.toLocaleString()} / 2,000`,
    [charCount],
  );

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

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-dark)]">
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--border)]">
        <div className="mx-auto max-w-[1200px] px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Image
              src="/guardian-logo.png"
              alt="Guardian AI logo"
              width={180}
              height={56}
              priority
              className="h-[44px] w-auto"
            />
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-[-0.02em]">
                Guardian AI
              </div>
              <div className="text-[13px] text-[var(--text-muted)]">
                Research &amp; Analytics Workflow
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-4" aria-label="Utility">
            <a
              href="#"
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-dark)]"
            >
              ⚙️ Settings
            </a>
            <button
              type="button"
              className="rounded-lg bg-[var(--navbar-btn)] text-white text-sm font-semibold px-4 py-2 hover:brightness-110"
            >
              ⬇ Export Data
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-5 pb-10">
        {/* SECTION 1 */}
        <section className="rounded-[var(--radius)] overflow-hidden shadow-sm">
          <button
            type="button"
            aria-expanded={consoleExpanded}
            className="w-full text-left px-5 py-4 text-white cursor-pointer flex items-center justify-between gap-4 border-0"
            style={{
              background:
                "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
            }}
            onClick={() => setConsoleExpanded((v) => !v)}
          >
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <span className="h-11 w-11 rounded-[10px] bg-white text-[var(--gradient-start)] flex items-center justify-center shrink-0">
                <IconMagnifier />
              </span>
              <div className="min-w-0">
                <div className="font-bold text-base">
                  AI Research &amp; Investigation Console
                </div>
                <div className="text-[13px] opacity-90 leading-snug">
                  Ask questions, upload data, and run AI-powered research across
                  platform intelligence
                </div>
              </div>
            </div>
            <span
              className="h-7 w-7 flex items-center justify-center shrink-0 transition-transform"
              style={{ transform: consoleExpanded ? "rotate(180deg)" : undefined }}
              aria-hidden="true"
            >
              <IconChevronDown />
            </span>
          </button>

          {consoleExpanded ? (
            <div className="bg-white px-5 py-5 border border-[var(--border)] border-t-0 rounded-b-[var(--radius)]">
              <div className="relative mb-3">
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
                  className="w-full min-h-[150px] max-h-[320px] resize-y rounded-lg border border-[var(--border)] px-4 py-4 pb-8 text-sm leading-relaxed focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]"
                />
                <div className="absolute bottom-2 right-3 text-xs text-[var(--text-muted)]">
                  {charCountLabel}
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-dark)] inline-flex items-center gap-1.5"
                >
                  <IconClock /> Research History
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-dark)]"
                    onClick={() => setQuery("")}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary), var(--primary-dark))",
                    }}
                  >
                    ▶ Run Research
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Left: Data Sources */}
                <div>
                  <div className="flex items-center gap-2 font-bold text-[15px] mb-3.5">
                    <span className="text-[var(--gradient-start)]">
                      <IconDatabase />
                    </span>
                    Data Sources for Research
                  </div>

                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: "Platform Content", checked: true },
                      { label: "User Behavior Logs" },
                      { label: "Moderation History" },
                      { label: "Policy Enforcement Logs" },
                      { label: "External Threat & Trend Feeds" },
                    ].map((row) => (
                      <label
                        key={row.label}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={row.checked}
                          className="h-[18px] w-[18px] accent-[#0D9488]"
                        />
                        {row.label}
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-[var(--border)]">
                    <div className="text-[13px] font-semibold mb-2">
                      External Data Input
                    </div>
                    <div className="flex gap-2 flex-wrap mb-2">
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-[13px] font-semibold hover:border-[var(--primary)] hover:text-[var(--primary-dark)]"
                      >
                        ⬆ Upload File
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-[13px] font-semibold hover:border-[var(--primary)] hover:text-[var(--primary-dark)]"
                      >
                        + Add URL
                      </button>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Supported: CSV, JSON, PDF, TXT, Logs, External URLs
                    </div>
                  </div>
                </div>

                {/* Right: Filters */}
                <div>
                  <div className="flex items-center gap-2 font-bold text-[15px] mb-3.5">
                    <span className="text-[var(--gradient-start)]">
                      <IconFilter />
                    </span>
                    Research Filters
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        label: "Date Range",
                        id: "f-date",
                        options: ["Last 24h", "Last 7 days", "Last 30 days", "Custom"],
                        defaultValue: "Last 7 days",
                      },
                      {
                        label: "Region",
                        id: "f-region",
                        options: [
                          "Global",
                          "North America",
                          "Europe",
                          "Asia",
                          "Latin America",
                          "Middle East & Africa",
                        ],
                        defaultValue: "Global",
                      },
                      {
                        label: "Language",
                        id: "f-lang",
                        options: ["All", "English", "Spanish", "French", "Other"],
                        defaultValue: "All",
                      },
                      {
                        label: "Content Type",
                        id: "f-content",
                        options: ["All", "Text", "Image", "Video", "Mixed"],
                        defaultValue: "All",
                      },
                      {
                        label: "Risk Category",
                        id: "f-risk",
                        options: [
                          "All",
                          "Hate & Harassment",
                          "Misinformation",
                          "Spam & Scams",
                          "Violence",
                        ],
                        defaultValue: "All",
                      },
                    ].map((f) => (
                      <div key={f.id}>
                        <label
                          htmlFor={f.id}
                          className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1"
                        >
                          {f.label}
                        </label>
                        <select
                          id={f.id}
                          defaultValue={f.defaultValue}
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        >
                          {f.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[15px] font-bold mb-3 flex items-center gap-1.5">
                ◎ Research Mode
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: "quick" as const,
                    title: "Quick Insight",
                    desc: "Fast summary, minimal depth",
                    accent: "var(--primary)",
                    activeBg: "#F0FDF9",
                  },
                  {
                    key: "deep" as const,
                    title: "Deep Research",
                    desc: "Full model execution + correlations",
                    accent: "var(--primary)",
                    activeBg: "#F0FDF9",
                  },
                  {
                    key: "predictive" as const,
                    title: "Predictive Analysis",
                    desc: "Forecast-focused results",
                    accent: "var(--purple-chart)",
                    activeBg: "#FAF5FF",
                  },
                ].map((m) => {
                  const active = mode === m.key;
                  return (
                    <label
                      key={m.key}
                      className="block cursor-pointer rounded-lg border-2 px-4 py-3.5 transition"
                      style={{
                        borderColor: active ? m.accent : "var(--border)",
                        background: active ? m.activeBg : "#fff",
                        boxShadow: active
                          ? `0 0 0 1px ${m.accent}`
                          : undefined,
                      }}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={m.key}
                        checked={mode === m.key}
                        onChange={() => setMode(m.key)}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-0.5 h-[18px] w-[18px] rounded-full border-2"
                          style={{
                            borderColor: active ? m.accent : "var(--border)",
                            background: active ? m.accent : "transparent",
                            position: "relative",
                          }}
                          aria-hidden="true"
                        >
                          {active ? (
                            <span
                              className="absolute rounded-full bg-white"
                              style={{ inset: 4 }}
                            />
                          ) : null}
                        </span>
                        <div>
                          <div className="font-bold text-sm">{m.title}</div>
                          <p className="m-0 text-[13px] text-[var(--text-muted)]">
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {mode === "predictive" ? (
                <div
                  className="mt-3 rounded-lg border px-3 py-3"
                  style={{
                    borderColor: "rgb(124 58 237 / 25%)",
                    background:
                      "linear-gradient(135deg, rgb(124 58 237 / 8%), #ffffff)",
                  }}
                >
                  <div className="flex items-end gap-1.5 h-14">
                    {[28, 42, 35, 55, 48, 62, 58, 75, 88, 100].map((h, i) => (
                      <span
                        key={i}
                        className="w-[10px] rounded-t-[4px]"
                        style={{
                          height: `${h}%`,
                          background: "var(--purple-chart)",
                          opacity: 0.85,
                        }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-[var(--purple-chart)]">
                    Predictive risk trajectory (7-day forecast) — purple series
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* SECTION 2 */}
        <section className="mt-6 rounded-[var(--radius)] border border-[#A7F3D0] bg-[var(--insight-card-bg)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shrink-0">
                <IconTealBrain />
              </span>
              <div>
                <div className="text-[17px] font-bold">AI Insight Summary</div>
                <div className="text-[13px] text-[var(--text-muted)]">
                  Intelligence Layer
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6EE7B7] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--primary-dark)]">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              Live
            </span>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm leading-relaxed">
            Hate speech increased by 18% in the last 7 days. Two emerging topic
            clusters are driving this rise. Engagement spikes correlate strongly
            with flagged content. Recommended action: tighten moderation
            thresholds.
          </div>

          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center flex-wrap gap-4 text-[13px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-dark)]">
                <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                Confidence: 94%
              </span>
              <span>Updated 2 minutes ago</span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary), var(--primary-dark))",
              }}
              onClick={() => setReportOpen(true)}
            >
              Generate Report
            </button>
          </div>
        </section>
      </main>

      {/* MODAL */}
      {reportOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReportOpen(false);
          }}
          style={{ background: "rgb(15 23 42 / 45%)" }}
        >
          <div className="w-full max-w-[640px] max-h-[min(90vh,720px)] rounded-[var(--radius)] bg-white shadow-2xl overflow-hidden flex flex-col">
            <div
              className="px-5 py-4 text-white flex items-start justify-between gap-4"
              style={{
                background:
                  "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
              }}
            >
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 rounded-[10px] flex items-center justify-center shrink-0 text-white bg-white/20">
                  <IconDocument />
                </span>
                <div>
                  <div className="text-base font-bold">Intelligence Report</div>
                  <div className="text-xs opacity-90">{MODAL_GENERATED}</div>
                </div>
              </div>
              <button
                ref={closeXRef}
                type="button"
                aria-label="Close"
                className="h-[34px] w-[34px] rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                onClick={() => setReportOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <h2
                  id="report-title"
                  className="m-0 text-lg font-bold text-[var(--text-dark)]"
                >
                  Guardian AI Intelligence Report
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6EE7B7] bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[var(--primary-dark)]">
                  <span className="h-[7px] w-[7px] rounded-full bg-[var(--primary)]" />
                  Confidence: 94%
                </span>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--text-muted)] pb-4 mb-5 border-b border-[var(--border)]">
                <span>Report Type: AI Insight Summary</span>
                <span>Generated: 3/7/2026</span>
                <span>Last Updated: 2 minutes ago</span>
              </div>

              <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Executive Summary
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm leading-relaxed mb-5">
                Hate speech increased by 18% in the last 7 days. Two emerging
                topic clusters are driving this rise. Engagement spikes correlate
                strongly with flagged content. Recommended action: tighten
                moderation thresholds.
              </div>

              <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Key Findings
              </div>
              <div className="space-y-2.5 mb-5">
                {[
                  {
                    title: "Hate speech increased by 18% in the last 7 days",
                    desc: "Significant spike detected across multiple regions",
                  },
                  {
                    title: "Two emerging topic clusters driving the rise",
                    desc: "Coordinated activity patterns identified",
                  },
                  {
                    title:
                      "Strong correlation between engagement spikes and flagged content",
                    desc: "Statistical significance: p < 0.01",
                  },
                ].map((k) => (
                  <div
                    key={k.title}
                    className="flex gap-3 rounded-lg border border-[var(--border)] bg-white p-3.5"
                  >
                    <span className="text-[var(--primary)] shrink-0">
                      <IconArrowRight />
                    </span>
                    <div>
                      <div className="text-sm font-bold mb-1">{k.title}</div>
                      <div className="text-[13px] text-[var(--text-muted)]">
                        {k.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Recommended Actions
              </div>
              <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-4 mb-4">
                <ul className="m-0 p-0 list-none space-y-2 text-sm">
                  {[
                    "Tighten moderation thresholds for identified topic clusters",
                    "Increase monitoring frequency during peak engagement hours",
                    "Deploy additional resources to high-risk regions",
                    "Review and update content policy guidelines",
                  ].map((a) => (
                    <li key={a} className="relative pl-6">
                      <span className="absolute left-0 font-bold text-[#EA580C]">
                        ✓
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                <div className="mb-1">
                  <span className="font-semibold text-[var(--text-dark)]">
                    Data Sources:
                  </span>{" "}
                  Platform Content, User Behavior Logs, Moderation History
                </div>
                <div className="mb-1">
                  <span className="font-semibold text-[var(--text-dark)]">
                    Models Used:
                  </span>{" "}
                  T5/Pegasus (Summarization), LSTM (Trends), LDA/BERTopic
                  (Topics), ML Classification (Health Scoring)
                </div>
                <div className="mb-1">
                  <span className="font-semibold text-[var(--text-dark)]">
                    Confidence Level:
                  </span>{" "}
                  94% (High)
                </div>
                <div>
                  <span className="font-semibold text-[var(--text-dark)]">
                    Report ID:
                  </span>{" "}
                  GRD-1772880009993
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[#F8FAFC] flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-[var(--text-muted)] max-w-[280px] flex items-center gap-1.5">
                <span aria-hidden="true">ⓘ</span> This report is confidential and
                intended for authorized personnel only
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
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary), var(--primary-dark))",
                  }}
                >
                  ⬇ Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
