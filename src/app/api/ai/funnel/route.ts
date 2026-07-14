// app/api/ai/funnel/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export async function GET(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (await getToken({ template: "convex" })) ?? undefined;
    if (!token) {
      return NextResponse.json(
        { error: "Unable to verify session with Convex" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    // Note: any employerId query param is intentionally ignored.
    const employerId = userId;

    const funnelData = await fetchQuery(
      api.ai.getHiringFunnel,
      { userId: employerId, jobId: jobId ? (jobId as Id<"jobs">) : undefined },
      { token }
    );

    const stages = [
      { name: "Sourced", value: funnelData.sourced || 0 },
      { name: "Applied", value: funnelData.applied || 0 },
      { name: "Reviewed", value: funnelData.reviewed || 0 },
      { name: "Shortlisted", value: funnelData.shortlisted || 0 },
      { name: "Interviewing", value: funnelData.interviewing || 0 },
      { name: "Offered", value: funnelData.offer || 0 },
      { name: "Hired", value: funnelData.hired || 0 },
      { name: "Rejected", value: funnelData.rejected || 0 },
    ];

    const total = stages.reduce((sum, s) => sum + s.value, 0);

    const conversionRates = {
      appliedToInterview:
        funnelData.applied > 0
          ? Math.round((funnelData.interviewing / funnelData.applied) * 100)
          : 0,
      interviewToOffer:
        funnelData.interviewing > 0
          ? Math.round((funnelData.offer / funnelData.interviewing) * 100)
          : 0,
      offerToHired:
        funnelData.offer > 0 ? Math.round((funnelData.hired / funnelData.offer) * 100) : 0,
      overall: total > 0 ? Math.round((funnelData.hired / funnelData.sourced) * 100) : 0,
    };

    const insights = generateFunnelInsights(funnelData, conversionRates);

    return NextResponse.json({
      success: true,
      stages,
      total,
      conversionRates,
      insights,
      raw: funnelData,
    });
  } catch (error) {
    console.error("Funnel Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch funnel analytics" }, { status: 500 });
  }
}

function generateFunnelInsights(funnelData: any, conversionRates: any): string[] {
  const insights: string[] = [];

  const applied = funnelData.applied || 0;
  const interviewed = funnelData.interviewing || 0;
  const offered = funnelData.offer || 0;
  const hired = funnelData.hired || 0;

  if (applied > 0 && interviewed === 0) {
    insights.push(
      "No candidates are progressing to interviews. Consider reviewing your screening criteria."
    );
  }
  if (interviewed > 0 && offered === 0) {
    insights.push(
      "Candidates are interviewing but not receiving offers. Consider reviewing your interview process."
    );
  }
  if (offered > 0 && hired === 0) {
    insights.push(
      "Offers are being extended but not accepted. Consider reviewing your offer competitiveness."
    );
  }
  if (conversionRates.appliedToInterview < 20 && applied > 10) {
    insights.push(
      "Low application-to-interview conversion rate. Consider broadening your screening criteria."
    );
  }
  if (conversionRates.interviewToOffer < 30 && interviewed > 5) {
    insights.push("Low interview-to-offer conversion rate. Consider reviewing your interview process.");
  }
  if (conversionRates.offerToHired < 50 && offered > 3) {
    insights.push("Low offer-to-hired conversion rate. Consider reviewing your compensation packages.");
  }
  if (insights.length === 0) {
    if (hired > 0) {
      insights.push(
        `Successfully hired ${hired} candidates. Overall conversion rate: ${conversionRates.overall}%.`
      );
    } else {
      insights.push("No hiring activity yet. Start reviewing candidates to see funnel insights.");
    }
  }

  return insights;
}