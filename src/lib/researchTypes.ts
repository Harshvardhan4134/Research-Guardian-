export type ResearchMode = "quick" | "deep" | "predictive";

export type DataSourcesSelection = {
  platformContent: boolean;
  userBehaviorLogs: boolean;
  moderationHistory: boolean;
  policyEnforcementLogs: boolean;
  externalThreatFeeds: boolean;
};

export type ResearchFilters = {
  dateRange: "24h" | "7d" | "30d" | "custom";
  customStart?: string; // ISO date (YYYY-MM-DD)
  customEnd?: string; // ISO date (YYYY-MM-DD)
  region:
    | "global"
    | "north-america"
    | "europe"
    | "asia"
    | "africa"
    | "latin-america";
  language: "all" | "english" | "spanish" | "french" | "arabic" | "mandarin";
  contentType: "all" | "text" | "image" | "video" | "audio";
  riskCategory:
    | "all"
    | "hate-speech"
    | "misinformation"
    | "scams"
    | "political"
    | "violence";
};

export type TopicIntelligenceSeries = {
  time: string[];
  hate_speech: number[];
  misinformation: number[];
  scams: number[];
  normal: number[];
};

export type TopicIntelligenceResponse = {
  model: 2;
  title: "Topic Intelligence";
  subtitle: string;
  growth: {
    hate: number;
    misinfo: number;
    scams: number;
    normal: number;
  };
  confidence: number;
  tags: string[];
  series: TopicIntelligenceSeries;
};

export type AnomalyPoint = {
  index: number;
  label: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

export type AnomalyDetectionResponse = {
  model: 3;
  title: "Anomaly Detection";
  subtitle: string;
  totalAnomalies: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  series: {
    time: string[];
    activity: number[];
    anomalies: AnomalyPoint[];
  };
};

export type ForecastResponse = {
  model: 4;
  title: "Forecast Engine";
  subtitle: string;
  riskIncreasePercent: number;
  peakDayLabel: string;
  confidence: number;
  series: {
    time: string[];
    actual: number[];
    predicted: number[];
    bandUpper: number[];
    bandLower: number[];
  };
};

export type RiskDistributionItem = {
  key: "toxicity" | "harassment" | "misinformation" | "trust";
  label: string;
  value: number;
  trend: "up" | "down";
  modelSource: 2 | 3 | 5;
};

export type RiskDistributionResponse = {
  title: "Risk Distribution";
  subtitle: string;
  items: RiskDistributionItem[];
};

export type GraphNetworkResponse = {
  model: 5;
  title: "Coordination Network";
  subtitle: string;
  suspiciousClusters: number;
  insights: string[];
  graph: {
    nodes: { id: string; risk_score: number }[];
    edges: { source: string; target: string }[];
  };
};

export type ModelHealth = {
  id: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  tech: string;
  accuracy: number;
  latencyMs: number;
  drift: "Stable" | "Low" | "Monitor";
  stability: "High" | "Medium" | "Low";
};

export type SystemHealthResponse = {
  title: "System Health & Model Status";
  subtitle: string;
  overallStatus: "All Systems Operational" | "Degraded" | "Offline";
  models: ModelHealth[];
};

export type ExplanationResponse = {
  model: 6;
  title: "AI Insight Summary";
  subtitle: string;
  live: boolean;
  summary: string;
  reasoningBullets: string[];
  recommendedActions: string[];
  confidence: number;
  updatedAt: string;
};

export type ResearchSnapshot = {
  request: {
    query: string;
    mode: ResearchMode;
    sources: DataSourcesSelection;
    filters: ResearchFilters;
  };
  explanation: ExplanationResponse;
  topicIntelligence: TopicIntelligenceResponse;
  anomalyDetection: AnomalyDetectionResponse;
  forecast: ForecastResponse;
  riskDistribution: RiskDistributionResponse;
  graphNetwork: GraphNetworkResponse;
  systemHealth: SystemHealthResponse;
};

