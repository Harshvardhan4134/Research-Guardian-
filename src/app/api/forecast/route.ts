import { NextRequest } from "next/server";
import { generateSnapshot } from "@/lib/mockResearchEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").slice(0, 2000);

  const snapshot = generateSnapshot({
    query: q,
    mode: "predictive",
    sources: {
      platformContent: true,
      userBehaviorLogs: true,
      moderationHistory: true,
      policyEnforcementLogs: true,
      externalThreatFeeds: true,
    },
    filters: {
      dateRange: "30d",
      region: "global",
      language: "all",
      contentType: "all",
      riskCategory: "all",
    },
    now: new Date(),
  });

  return Response.json(snapshot.forecast, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

