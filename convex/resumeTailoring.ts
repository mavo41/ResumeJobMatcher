"use node";

import { internalAction, action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateChatCompletion } from "../src/app/lib/ai/aiProvider";
import { sanitizeForPrompt } from "./lib/sanitizeForPrompt";

export const tailorResumeForJob = action({
  args: {
    resumeId: v.id("resumes"),
    jobTitle: v.string(),
    jobDescription: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.runQuery(internal.resumes.getResumeInternal, { id: args.resumeId });
    if (!resume || resume.userId !== identity.subject) throw new Error("Forbidden");

    const url = await ctx.storage.getUrl(resume.fileStorageId);
    if (!url) throw new Error("Resume file not found");
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";

    const { extractResumeText } = await import("../src/app/lib/pdfExtractor");
    const extraction = await extractResumeText(buffer, contentType);
    if (!extraction.ok) throw new Error(extraction.error);

    const prompt = `You are a resume coach helping a candidate tailor their EXISTING resume for a specific job — never inventing new experience.

${sanitizeForPrompt(extraction.text, "candidate_resume")}

${sanitizeForPrompt(args.jobDescription, "job_description")}

HARD RULES — violating these is a failure:
1. NEVER suggest adding a skill, technology, certification, or achievement the candidate has not already stated somewhere in their resume above. If the job wants "C++" and the resume never mentions C++, you MUST NOT suggest adding it — instead, flag it under "genuineGaps" as something the candidate should NOT claim.
2. You MAY suggest: rephrasing existing bullet points to better match the job's terminology, reordering sections/bullets by relevance, quantifying achievements the candidate already described qualitatively, and emphasizing already-stated experience that's currently buried or underselling.
3. Every suggestion must cite exactly which existing resume content it's based on.

Respond with ONLY this JSON shape:
{
  "suggestions": [
    { "section": "summary" | "experience" | "skills" | "projects", "current": string, "suggested": string, "reasoning": string, "basedOn": string, "estimatedPointImpact": number }
  ],
  "genuineGaps": [ { "requirement": string, "note": "Candidate does not appear to have this — do not add it; consider whether to apply anyway or build this skill first." } ]
}`;

    const result = await generateChatCompletion(prompt, { taskType: "structured_json" });
    const parsed = JSON.parse(result.text);
    return parsed;
  },
});

