// app/api/ai/employeranalyze/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { AIPipeline } from "../../../lib/ai/AIPipeline";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export async function POST(request: Request) {
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

    const employerId = userId;

    const { resumeText, jobRequirements, candidateId } = await request.json();

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    }

    // If a jobId is embedded in jobRequirements, verify ownership before
    // attributing this analysis to the caller's employer account.
    if (jobRequirements?.jobId) {
      const job = await fetchQuery(
        api.jobs.getJobById,
        { jobId: jobRequirements.jobId as Id<"jobs"> },
        { token }
      );
      if (!job || job.employerId !== employerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const pipeline = new AIPipeline();
    const result = await pipeline.processResume(resumeText, jobRequirements, candidateId, token);
    if (jobRequirements?.jobId) {
      try {
        await fetchMutation(
          api.ai.saveAIAnalysis,
          {
            employerId,
            jobId: jobRequirements.jobId as Id<"jobs">,
            candidateId,
            type: "candidate_explanation",
            result,
            score: result.score.overall,
            confidence: result.confidence.score,
            risk: result.score.risk,
            recommendations: result.recommendations,
          },
          { token }
        );
      } catch (saveError) {
        console.warn("Failed to save AI analysis:", saveError);
      }
    }

    return NextResponse.json({
      ...result,
      disclaimer:
        "This analysis was conducted using proprietary algorithms. AI was used only for presentation formatting.",
    });
  } catch (error) {
    console.error("AI Analyze Error:", error);
    return NextResponse.json({ error: "Failed to analyze resume" }, { status: 500 });
  }
}