// app/api/ai/chat/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIPipeline } from "../../../lib/ai/AIPipeline";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

export async function POST(request: Request) {
  try {
    const { message, context } = await request.json();

    // 1. Use AI Pipeline to generate structured insights (if needed)
    let structuredInsights = null;
    if (context.candidates && context.jobRequirements) {
      const pipeline = new AIPipeline();
      
      // Filter candidates that have resumeText
      const candidatesWithResume = context.candidates
        .filter((c: any) => c.resumeText || c.notes)
        .slice(0, 5);
      
      if (candidatesWithResume.length > 0) {
        const results = await Promise.all(
          candidatesWithResume.map(async (candidate: any) => {
            const resumeText = candidate.resumeText || candidate.notes || "";
            // Pass jobRequirements as is - the pipeline expects JobRequirements type
            return await pipeline.processResume(
              resumeText,
              context.jobRequirements,
              candidate.id || candidate._id || 'unknown'
            );
          })
        );
        structuredInsights = results;
      }
    }

    // 2. Build a rich context with structured data
    const systemPrompt = `
You are an AI Hiring Assistant helping an employer make better hiring decisions.

CONTEXT:
- ${context.candidates?.length || 0} candidates available
- Job: ${context.jobTitle || "Not specified"}

${structuredInsights ? `STRUCTURED INSIGHTS (from proprietary AI Engine):
${JSON.stringify(structuredInsights.map((r: any) => ({
  candidateName: r.parsedResume?.contact?.fullName || 'Candidate',
  score: r.score.overall,
  confidence: r.confidence.score,
  risk: r.score.risk,
  recommendation: r.recommendations[0] || 'No recommendation'
})), null, 2)}` : 'No structured data available'}

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

    // 3. Use Gemini for conversational response
    if (!genAI) {
      return NextResponse.json({
        response: "AI service is not configured. Please set GEMINI_API_KEY.",
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const fullPrompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

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