import { NextRequest } from "next/server";
import { generateSnapshot } from "@/lib/mockResearchEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").slice(0, 2000);
  const mode = (sp.get("mode") ?? "quick") as "quick" | "deep" | "predictive";

  const snapshot = generateSnapshot({
    query: q,
    mode: mode === "predictive" ? "predictive" : mode === "deep" ? "deep" : "quick",
    sources: {
      platformContent: true,
      userBehaviorLogs: true,
      moderationHistory: true,
      policyEnforcementLogs: true,
      externalThreatFeeds: true,
    },
    filters: {
      dateRange: "7d",
      region: "global",
      language: "all",
      contentType: "all",
      riskCategory: "all",
    },
    now: new Date(),
  });

  return Response.json(snapshot.graphNetwork, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

