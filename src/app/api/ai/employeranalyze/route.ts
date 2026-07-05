// app/api/ai/employeranalyze/route.ts
import { NextResponse } from "next/server";
import { AIPipeline } from "../../../lib/ai/AIPipeline";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { resumeText, jobRequirements, candidateId, employerId } = await request.json();

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId is required" },
        { status: 400 }
      );
    }

    const pipeline = new AIPipeline();
    const result = await pipeline.processResume(
      resumeText, 
      jobRequirements,
      candidateId
    );

    // Save analysis to Convex (optional - for persistence)
    if (employerId && jobRequirements?.jobId) {
      try {
        await convex.mutation(api.ai.saveAIAnalysis, {
          employerId,
          jobId: jobRequirements.jobId as any, // Cast to Id<"jobs">
          candidateId,
          type: "candidate_explanation",
          result: result,
          score: result.score.overall,
          confidence: result.confidence.score,
          risk: result.score.risk,
          recommendations: result.recommendations,
        });
      } catch (saveError) {
        console.warn("Failed to save AI analysis:", saveError);
        // Don't fail the request if saving fails
      }
    }

    return NextResponse.json({
      ...result,
      disclaimer: "This analysis was conducted using proprietary algorithms. AI was used only for presentation formatting.",
    });
  } catch (error) {
    console.error("AI Analyze Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume" },
      { status: 500 }
    );
  }
}