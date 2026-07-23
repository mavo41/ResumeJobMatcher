import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateChatCompletion } from "../../../lib/ai/aiProvider";
import { sanitizeForPrompt } from "../../../../../convex/lib/sanitizeForPrompt";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resumeText, jobTitle, jobDescription } = await request.json();
    if (!resumeText) {
      return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
    }

    const prompt = `You are an experienced technical interviewer preparing for a candidate interview.

JOB TITLE: ${jobTitle || "Not specified"}

${sanitizeForPrompt(jobDescription || "", "job_description")}

${sanitizeForPrompt(resumeText, "candidate_resume")}

Generate 6-8 interview questions specifically tailored to THIS candidate's background and THIS role. Mix technical questions probing their listed skills/projects, and behavioral questions probing gaps or claims worth verifying. Each question must reference something specific from the resume or job — no generic filler questions.

Respond with ONLY a JSON object: { "questions": [ { "question": string, "purpose": string } ] }`;

    const result = await generateChatCompletion(prompt, { taskType: "structured_json" });
    const parsed = JSON.parse(result.text);

    return NextResponse.json({ questions: parsed.questions || [] });
  } catch (error: any) {
    console.error("Interview questions error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate questions" }, { status: 500 });
  }
}