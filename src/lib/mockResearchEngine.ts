import type {
  AnomalyDetectionResponse,
  DataSourcesSelection,
  ExplanationResponse,
  ForecastResponse,
  GraphNetworkResponse,
  ResearchFilters,
  ResearchMode,
  ResearchSnapshot,
  RiskDistributionResponse,
  SystemHealthResponse,
  TopicIntelligenceResponse,
} from "./researchTypes";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function jitter(rand: () => number, amount = 1) {
  return (rand() - 0.5) * 2 * amount;
}

function buildTimeSeries(opts: { points: number; now: Date }) {
  const out: string[] = [];
  const stepMinutes = 15;
  for (let i = opts.points - 1; i >= 0; i--) {
    const t = new Date(opts.now.getTime() - i * stepMinutes * 60_000);
    out.push(
      `${t.getHours().toString().padStart(2, "0")}:${t
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
    );
  }
  return out;
}

function normalize100(v: number) {
  return clamp(Math.round(v), 0, 100);
}

function pick<T>(rand: () => number, arr: readonly T[]) {
  return arr[Math.floor(rand() * arr.length)]!;
}

function scoreColorBand(value: number) {
  if (value >= 75) return "high";
  if (value >= 50) return "medium";
  return "low";
}

export function generateSnapshot(input: {
  query: string;
  mode: ResearchMode;
  sources: DataSourcesSelection;
  filters: ResearchFilters;
  now: Date;
}): ResearchSnapshot {
  const base = `${input.query}::${input.mode}::${JSON.stringify(
    input.sources,
  )}::${JSON.stringify(input.filters)}`;

  const timeBucket = Math.floor(input.now.getTime() / 30_000); // 30s "live" feel
  const seed = hashStringToSeed(`${base}::${timeBucket}`);
  const rand = mulberry32(seed);

  const points = input.mode === "predictive" ? 18 : 16;
  const time = buildTimeSeries({ points, now: input.now });

  const hateBase = 52 + jitter(rand, 4);
  const misinfoBase = 36 + jitter(rand, 4);
  const scamsBase = 28 + jitter(rand, 4);

  const hateTrend = input.filters.riskCategory === "hate-speech" ? 1.35 : 1.12;
  const misinfoTrend =
    input.filters.riskCategory === "misinformation" ? 1.25 : 1.06;
  const scamsTrend = input.filters.riskCategory === "scams" ? 1.2 : 1.04;

  const hate: number[] = [];
  const misinfo: number[] = [];
  const scams: number[] = [];
  const normal: number[] = [];

  for (let i = 0; i < points; i++) {
    const wave = Math.sin((i / (points - 1)) * Math.PI * 1.3);
    const spikeChance = rand();
    const spike =
      spikeChance > 0.92 ? 18 + rand() * 14 : spikeChance > 0.86 ? 8 : 0;

    const h = normalize100(hateBase + i * hateTrend + wave * 9 + spike + jitter(rand, 3));
    const m = normalize100(misinfoBase + i * misinfoTrend + wave * 6 + jitter(rand, 3));
    const s = normalize100(scamsBase + i * scamsTrend + wave * 5 + jitter(rand, 3));
    const n = normalize100(100 - (h * 0.28 + m * 0.22 + s * 0.18) + jitter(rand, 4));

    hate.push(h);
    misinfo.push(m);
    scams.push(s);
    normal.push(n);
  }

  const growth = {
    hate: normalize100(((hate[hate.length - 1]! - hate[0]!) / 100) * 100),
    misinfo: normalize100(((misinfo[misinfo.length - 1]! - misinfo[0]!) / 100) * 100),
    scams: normalize100(((scams[scams.length - 1]! - scams[0]!) / 100) * 100),
    normal: normalize100(((normal[normal.length - 1]! - normal[0]!) / 100) * 100),
  };

  const topicIntelligence: TopicIntelligenceResponse = {
    model: 2,
    title: "Topic Intelligence",
    subtitle: "Powered by Clustering AI (HDBSCAN + BERT)",
    growth: {
      hate: clamp(Math.round(growth.hate / 2), 1, 35),
      misinfo: clamp(Math.round(growth.misinfo / 3), 0, 25),
      scams: clamp(Math.round(growth.scams / 4), 0, 18),
      normal: clamp(100 - clamp(Math.round((growth.hate + growth.misinfo) / 3), 0, 30), 70, 99),
    },
    confidence: clamp(84 + Math.round(rand() * 12), 70, 99),
    tags: ["#fraud", "#hate", "#election", "#scam2025", "#botnet"].slice(
      0,
      4 + (rand() > 0.6 ? 1 : 0),
    ),
    series: { time, hate_speech: hate, misinformation: misinfo, scams, normal },
  };

  const anomalyLabels = [
    "Bot Activity",
    "Spam Burst",
    "Coordinated Post",
    "Mass Flag",
    "Login Geo Shift",
    "Device Fingerprint Spike",
  ] as const;

  const activity: number[] = [];
  const anomalies: { index: number; label: string; severity: "LOW" | "MEDIUM" | "HIGH" }[] =
    [];

  let anomalyCount = 0;
  for (let i = 0; i < points; i++) {
    const baseActivity = 22 + i * 2.4 + Math.sin(i / 2.6) * 9 + jitter(rand, 3);
    const activitySpike = rand() > 0.9 ? 18 + rand() * 20 : 0;
    const v = normalize100(baseActivity + activitySpike);
    activity.push(v);

    if (activitySpike > 0 && anomalyCount < 6) {
      anomalyCount++;
      const severity =
        activitySpike > 30 ? "HIGH" : activitySpike > 22 ? "MEDIUM" : "LOW";
      anomalies.push({ index: i, label: pick(rand, anomalyLabels), severity });
    }
  }

  const overallSeverity: "LOW" | "MEDIUM" | "HIGH" =
    anomalies.some((a) => a.severity === "HIGH")
      ? "HIGH"
      : anomalies.some((a) => a.severity === "MEDIUM")
        ? "MEDIUM"
        : "LOW";

  const anomalyDetection: AnomalyDetectionResponse = {
    model: 3,
    title: "Anomaly Detection",
    subtitle: "Powered by Isolation Forest + Autoencoder",
    totalAnomalies: anomalies.length,
    severity: overallSeverity,
    series: { time, activity, anomalies },
  };

  const forecastPoints = 10;
  const forecastTime = Array.from({ length: forecastPoints }, (_, i) => {
    const d = new Date(input.now.getTime() + i * 5 * 24 * 60 * 60_000);
    const month = d.toLocaleString("en-US", { month: "short" });
    return `${month} ${d.getDate()}`;
  });

  const actual: number[] = [];
  const predicted: number[] = [];
  const bandUpper: number[] = [];
  const bandLower: number[] = [];

  const actualBase = 42 + jitter(rand, 4);
  for (let i = 0; i < forecastPoints; i++) {
    const a = normalize100(actualBase + Math.sin(i / 2.4) * 10 + i * 2.1 + jitter(rand, 3));
    const p = normalize100(a + 6 + i * 1.4 + jitter(rand, 4));
    const width = clamp(8 + rand() * 10, 6, 18);
    actual.push(a);
    predicted.push(p);
    bandUpper.push(normalize100(p + width));
    bandLower.push(normalize100(p - width));
  }

  const forecast: ForecastResponse = {
    model: 4,
    title: "Forecast Engine",
    subtitle:
      "Powered by Temporal AI (TFT/LSTM Model) — 4-Week Prediction",
    riskIncreasePercent: clamp(14 + Math.round(rand() * 18), 8, 38),
    peakDayLabel: `Day ${clamp(18 + Math.round(rand() * 12), 12, 30)}`,
    confidence: clamp(78 + Math.round(rand() * 16), 65, 96),
    series: {
      time: forecastTime,
      actual,
      predicted,
      bandUpper,
      bandLower,
    },
  };

  const riskDistribution: RiskDistributionResponse = {
    title: "Risk Distribution",
    subtitle: "Aggregated output — all values normalized 0–100",
    items: [
      {
        key: "toxicity",
        label: "Toxicity",
        value: normalize100(60 + rand() * 25),
        trend: rand() > 0.35 ? "up" : "down",
        modelSource: 3,
      },
      {
        key: "harassment",
        label: "Harassment",
        value: normalize100(54 + rand() * 22),
        trend: rand() > 0.45 ? "up" : "down",
        modelSource: 3,
      },
      {
        key: "misinformation",
        label: "Misinformation",
        value: normalize100(44 + rand() * 20),
        trend: rand() > 0.55 ? "down" : "up",
        modelSource: 2,
      },
      {
        key: "trust",
        label: "Trust Signals",
        value: normalize100(70 + rand() * 22),
        trend: rand() > 0.3 ? "up" : "down",
        modelSource: 5,
      },
    ],
  };

  const nodeCount = 22;
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `U${(i + 1).toString().padStart(2, "0")}`,
    risk_score: normalize100(18 + rand() * 82),
  }));

  const edges: { source: string; target: string }[] = [];
  for (let i = 0; i < nodeCount * 1.2; i++) {
    const a = pick(rand, nodes);
    let b = pick(rand, nodes);
    if (b.id === a.id) b = pick(rand, nodes);
    edges.push({ source: a.id, target: b.id });
  }

  const suspiciousClusters = clamp(3 + Math.round(rand() * 4), 2, 8);
  const graphNetwork: GraphNetworkResponse = {
    model: 5,
    title: "Coordination Network",
    subtitle: "Powered by Graph Intelligence (GraphSAGE) — Drag nodes to explore",
    suspiciousClusters,
    insights: [
      `${clamp(4 + Math.round(rand() * 4), 3, 9)} accounts acting as bot network`,
      "Coordinated activity detected",
      `${clamp(2 + Math.round(rand() * 4), 1, 7)} shared IP clusters`,
    ],
    graph: { nodes, edges },
  };

  const explanationConfidence = clamp(88 + Math.round(rand() * 10), 70, 99);
  const explanation: ExplanationResponse = {
    model: 6,
    title: "AI Insight Summary",
    subtitle: "Intelligence Layer",
    live: true,
    summary:
      input.filters.riskCategory === "hate-speech"
        ? "Hate speech increased sharply within the selected window. Two emerging topic clusters are driving the rise, and engagement spikes correlate strongly with flagged content. Recommended action: tighten moderation thresholds and review flagged clusters."
        : "Risk signals increased within the selected window. Topic spikes and coordinated behavior correlate strongly with anomalies in engagement. Recommended action: prioritize review of flagged clusters and adjust thresholds for high-risk categories.",
    reasoningBullets: [
      "Topic spike detected (Model 2)",
      "Bot activity detected (Model 3)",
      "Coordinated activity detected (Model 5)",
      input.mode === "predictive"
        ? "Forecast indicates elevated risk persists (Model 4)"
        : "Engagement anomaly correlates with flagged clusters",
    ],
    recommendedActions: [
      "Increase moderation in high-risk regions",
      "Adjust anomaly thresholds for bot activity",
      "Review flagged clusters and coordinated nodes",
      "Generate and distribute incident report",
    ],
    confidence: explanationConfidence,
    updatedAt: input.now.toISOString(),
  };

  const systemHealthModels: SystemHealthResponse["models"] = [
    {
      id: 1,
      name: "Unified Representation",
      tech: "CLIP + BERT Embeddings",
      accuracy: clamp(92 + Math.round(rand() * 6), 80, 99),
      latencyMs: clamp(28 + Math.round(rand() * 30), 18, 120),
      drift: "Stable",
      stability: "High",
    },
    {
      id: 2,
      name: "Topic Intelligence",
      tech: "HDBSCAN Clustering",
      accuracy: clamp(86 + Math.round(rand() * 10), 70, 98),
      latencyMs: clamp(55 + Math.round(rand() * 50), 25, 180),
      drift: "Low",
      stability: "High",
    },
    {
      id: 3,
      name: "Anomaly Detection",
      tech: "Isolation Forest + AE",
      accuracy: clamp(82 + Math.round(rand() * 12), 65, 96),
      latencyMs: clamp(40 + Math.round(rand() * 40), 25, 160),
      drift: rand() > 0.75 ? "Monitor" : "Stable",
      stability: rand() > 0.7 ? "Medium" : "High",
    },
    {
      id: 4,
      name: "Forecast Engine",
      tech: "TFT / LSTM",
      accuracy: clamp(78 + Math.round(rand() * 12), 60, 94),
      latencyMs: clamp(160 + Math.round(rand() * 140), 90, 520),
      drift: "Stable",
      stability: "High",
    },
    {
      id: 5,
      name: "Graph Intelligence",
      tech: "GraphSAGE",
      accuracy: clamp(86 + Math.round(rand() * 10), 70, 98),
      latencyMs: clamp(70 + Math.round(rand() * 80), 35, 260),
      drift: "Stable",
      stability: "High",
    },
    {
      id: 6,
      name: "RAG-X Insight Engine",
      tech: "LLM + Vector DB",
      accuracy: clamp(84 + Math.round(rand() * 10), 70, 98),
      latencyMs: clamp(240 + Math.round(rand() * 220), 120, 900),
      drift: "Stable",
      stability: "High",
    },
  ];

  const systemHealth: SystemHealthResponse = {
    title: "System Health & Model Status",
    subtitle: "Real-time model performance monitoring",
    overallStatus: "All Systems Operational",
    models: systemHealthModels,
  };

  return {
    request: {
      query: input.query,
      mode: input.mode,
      sources: input.sources,
      filters: input.filters,
    },
    explanation,
    topicIntelligence,
    anomalyDetection,
    forecast,
    riskDistribution,
    graphNetwork,
    systemHealth,
  };
}

export function riskBandLabel(value: number) {
  return scoreColorBand(value);
}

