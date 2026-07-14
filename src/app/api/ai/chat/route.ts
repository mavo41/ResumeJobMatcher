// app/api/ai/chat/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateChatCompletion } from "../../../lib/ai/aiProvider";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, context } = await request.json();

    // let structuredInsights: any = null;
    // if (context?.candidates && context?.jobRequirements) {
    //   const pipeline = new AIPipeline();
    //   const candidatesWithResume = context.candidates
    //     .filter((c: any) => c.resumeText || c.notes)
    //     .slice(0, 5);

    //   if (candidatesWithResume.length > 0) {
    //     const results = await Promise.all(
    //       candidatesWithResume.map(async (candidate: any) => {
    //         const resumeText = candidate.resumeText || candidate.notes || "";
    //         return await pipeline.processResume(
    //           resumeText,
    //           context.jobRequirements,
    //           candidate.id || candidate._id || "unknown",
    //           token
    //         );
    //       })
    //     );
    //     structuredInsights = results;
    //   }
    // }

       // Use each candidate's ALREADY-COMPUTED matchScore/status rather than re-running the full scoring pipeline live in chat.

    const structuredInsights =
      context?.candidates?.length > 0
        ? context.candidates
            .filter((c: any) => typeof c.matchScore === "number")
            .map((c: any) => ({
              candidateName: c.name || "Candidate",
              score: c.matchScore,
              status: c.status,
            }))
        : null;

    const systemPrompt = `
You are an AI Hiring Assistant helping employer ${userId} make better hiring decisions.

CONTEXT:
- ${context?.candidates?.length || 0} candidates available
- Job: ${context?.jobTitle || "Not specified"}

${
  structuredInsights
    ? `STRUCTURED INSIGHTS (already-computed match scores for these candidates):
${JSON.stringify(structuredInsights, null, 2)}`
    : "No structured data available"
}

Your role:
1. Use the structured insights to answer questions accurately
2. Explain reasoning using the data provided
3. Be specific, data-driven, and unbiased
4. If asked about scores, refer to the proprietary scoring engine

Important: The scores and analysis come from a proprietary algorithm that considers:
- Skills matching (35% weight)
- Experience (25% weight)
- Education (15% weight)
- Projects (12% weight)
- Certifications (8% weight)
- Achievements (5% weight)

Bias prevention is automatically applied to all candidates.`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;

    let response: string;
    try {
      const result = await generateChatCompletion(fullPrompt, { taskType: "chat" });
      response = result.text;
    } catch (err: any) {
      console.error("AI Chat generation failed:", err);
      return NextResponse.json({
        response: "AI service is temporarily unavailable. Please try again shortly.",
      });
    }

    return NextResponse.json({
      response,
      disclaimer: "Analysis powered by proprietary scoring engine. AI used for conversation.",
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      { response: "I encountered an error processing your request. Please try again." },
      { status: 500 }
    );
  }
}