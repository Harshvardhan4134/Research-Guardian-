import { NextRequest } from "next/server";
import { generateSnapshot } from "@/lib/mockResearchEngine";
import type {
  DataSourcesSelection,
  ResearchFilters,
  ResearchMode,
} from "@/lib/researchTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBool(searchParams: URLSearchParams, key: string, fallback: boolean) {
  const v = searchParams.get(key);
  if (v === null) return fallback;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function getEnum<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
) {
  const v = searchParams.get(key);
  if (!v) return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const mode = getEnum<ResearchMode>(
    sp,
    "mode",
    ["quick", "deep", "predictive"],
    "quick",
  );

  const sources: DataSourcesSelection = {
    platformContent: getBool(sp, "src_platform", true),
    userBehaviorLogs: getBool(sp, "src_behavior", true),
    moderationHistory: getBool(sp, "src_moderation", true),
    policyEnforcementLogs: getBool(sp, "src_policy", true),
    externalThreatFeeds: getBool(sp, "src_external", true),
  };

  const filters: ResearchFilters = {
    dateRange: getEnum(sp, "dateRange", ["24h", "7d", "30d", "custom"], "7d"),
    region: getEnum(
      sp,
      "region",
      ["global", "north-america", "europe", "asia", "africa", "latin-america"],
      "global",
    ),
    language: getEnum(
      sp,
      "language",
      ["all", "english", "spanish", "french", "arabic", "mandarin"],
      "all",
    ),
    contentType: getEnum(
      sp,
      "contentType",
      ["all", "text", "image", "video", "audio"],
      "all",
    ),
    riskCategory: getEnum(
      sp,
      "riskCategory",
      [
        "all",
        "hate-speech",
        "misinformation",
        "scams",
        "political",
        "violence",
      ],
      "all",
    ),
  };

  const query = (sp.get("q") ?? "").slice(0, 2000);

  const snapshot = generateSnapshot({
    query,
    mode,
    sources,
    filters,
    now: new Date(),
  });

  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

