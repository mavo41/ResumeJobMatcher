"use node";

// convex/resumeAnalysis.ts

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { extractResumeText } from "../../resume-matcher/src/app/lib/pdfExtractor";
import { createHash } from "crypto";
import { normalizeFeedback, fallbackFeedback, cleanLLMResponse, isValidFeedbackShape } from "./lib/feedbackSchema";
import { sanitizeForPrompt } from "./lib/sanitizeForPrompt";
//import { GoogleGenAI } from "@google/genai";
//import pdfParse from "pdf-parse";
//import Groq from "groq-sdk";
import { generateChatCompletion } from "../src/app/lib/ai/aiProvider";
import { AIPipeline } from "../src/app/lib/ai/AIPipeline";

// Ordered by preference. If the first model is unavailable/quota-limited,
// the next is tried automatically. Update this list as Google
// deprecates/renames models — this is the ONE place that needs editing.
// const GEMINI_MODELS_TO_TRY = [
//   "gemini-2.5-flash",
//   "gemini-2.0-flash",
//   "gemini-2.0-flash-lite",
// ];

// Ordered by preference. If the first model is unavailable/rate-limited,
// the next is tried automatically. Groq's free tier requires no billing
// account — this is the current default provider. Update this list if
// Groq renames/deprecates models — this is the ONE place that needs
// editing.
// const GROQ_MODELS_TO_TRY = [
//   "llama-3.3-70b-versatile",
//   "llama-3.1-8b-instant",
//   "llama3-70b-8192",
// ];


// Improved prompt: forces the model to ground every tip in specific
// resume content, sets a minimum tip count per category so feedback is
// substantive rather than generic, and uses structured JSON output mode
// instead of relying on prose instructions to avoid markdown fences.
function buildPrompt(jobTitle: string, jobDescription: string, resumeText: string): string {
 const safeJobDescription = sanitizeForPrompt(jobDescription, "job_description");
  const safeResumeText = sanitizeForPrompt(resumeText, "resume_text");
  return `You are an expert technical recruiter and resume reviewer with deep ATS (Applicant Tracking System) knowledge.

TASK: Analyze the resume below for a candidate applying to the position "${jobTitle}".

JOB DESCRIPTION:
${jobDescription ? safeJobDescription : "Not provided — evaluate against general best practices for this job title."}

RESUME TEXT:
${safeResumeText}

INSTRUCTIONS:
1. Every tip you write MUST reference something specific and concrete from the resume text above (a phrase, section, skill, or missing element) — do not write generic advice that could apply to any resume.
2. For each category (ATS, content, skills, structure, toneAndStyle), provide AT LEAST 2 and AT MOST 5 tips, mixing "good" (things done well), "improve" (specific actionable fixes), and "warning" (critical gaps) types as appropriate to what you actually observe.
3. The "explanation" field for each tip must be 1-3 sentences justifying WHY it matters for this specific job, not a generic definition.
4. overallScore and each category score must be integers 0-100 reflecting genuine assessment — do not default to round numbers like 50/60/70 unless that is truly your assessment.
5. If the job description was not provided, evaluate against general strong-resume practices for the "${jobTitle}" role instead of penalizing missing job-specific keywords.

Respond with ONLY a JSON object matching this exact shape (no prose, no markdown fences):
{
  "overallScore": number,
  "ATS": { "score": number, "tips": [ { "type": "good" | "improve" | "warning", "tip": string, "explanation": string } ] },
  "content": { "score": number, "tips": [ ... ] },
  "skills": { "score": number, "tips": [ ... ] },
  "structure": { "score": number, "tips": [ ... ] },
  "toneAndStyle": { "score": number, "tips": [ ... ] }
}`;
}




async function callGroqWithFallback(
  prompt: string
): Promise<{ text: string; modelUsed: string } | { error: string }> {
  try {
    const result = await generateChatCompletion(prompt, { taskType: "structured_json" });
    return result;
  } catch (err: any) {
    return { error: err?.message || String(err) };
 }
}

function extractRequirementsFromText(description: string): string[] {
  const lines = description.split("\n").map((l) => l.trim());
  const requirements: string[] = [];

  const headingIdx = lines.findIndex((l) =>
    /looking for|requirements|qualifications|what you.?ll need/i.test(l)
  );
  const candidateLines = headingIdx >= 0 ? lines.slice(headingIdx + 1) : lines;

  for (const line of candidateLines) {
    const bulletMatch = line.match(/^[*\-•]\s*(.+)/);
    if (bulletMatch && bulletMatch[1].length > 3) {
      requirements.push(bulletMatch[1].trim());
    }
    if (requirements.length >= 20) break;
  }

  if (requirements.length === 0) {
    const techMatches = description.match(/\b[A-Z][a-zA-Z0-9.+#]{1,20}\b/g) || [];
    return Array.from(new Set(techMatches)).slice(0, 15);
  }

  return requirements;
}
export const analyzeResume = internalAction({
  args: {
    resumeId: v.id("resumes"),
    fileStorageId: v.id("_storage"),
    jobTitle: v.string(),
    jobDescription: v.string(),
    jobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.resumes.setAnalysisStatus, {
        resumeId: args.resumeId,
        status: "processing",
      });

    

      // 1. Fetch file from Convex storage
      const url = await ctx.storage.getUrl(args.fileStorageId);
      if (!url) {
        throw new Error("File not found in storage");
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const buffer = await response.arrayBuffer();

      // // 2. Extract text — with explicit PDF validation instead of a
      // // silent best-effort fallback.
      // let resumeText = "";

      // if (contentType.includes("text") || contentType.includes("json") || contentType.includes("xml")) {
      //   resumeText = new TextDecoder().decode(buffer);
      // } else if (looksLikePdf(buffer)) {
      //   try {
      //    // const data = await pdfParse(Buffer.from(buffer));
      //     const originalWarn = console.warn;
          
      //    console.warn = () => {};
      //     let data;
      //     try {
      //       data = await pdfParse(Buffer.from(buffer));
      //     } finally {
      //       console.warn = originalWarn;
      //     }
      //     resumeText = (data.text || "").trim();
      //   } catch (pdfError: any) {
      //     await ctx.runMutation(internal.resumes.setAnalysisStatus, {
      //       resumeId: args.resumeId,
      //       status: "failed",
      //       error: `Could not extract text from this PDF (${pdfError?.message || "parse error"}). Please re-export it as a standard, non-scanned PDF.`,
      //     });
      //     return;
      //   }
      // } else {
      //   await ctx.runMutation(internal.resumes.setAnalysisStatus, {
      //     resumeId: args.resumeId,
      //     status: "failed",
      //     error: `Uploaded file does not appear to be a valid PDF (content-type: "${contentType || "unknown"}"). Please upload a PDF file.`,
      //   });
      //   return;
      // }

      // if (!resumeText || resumeText.trim().length < 50) {
      //   await ctx.runMutation(internal.resumes.setAnalysisStatus, {
      //     resumeId: args.resumeId,
      //     status: "failed",
      //     error: "Resume text too short after extraction. Please upload a text-based (not scanned/image) PDF.",
      //   });
      //   return;
      // }

           // 2. Extract text via the shared helper (see Issue #9 note on

       const extraction = await extractResumeText(buffer, contentType);
      if (!extraction.ok) {
        await ctx.runMutation(internal.resumes.setAnalysisStatus, {
          resumeId: args.resumeId,
          status: "failed",
          error: extraction.error,
        });
        return;
      }
      const resumeText = extraction.text;

      const contentHash = createHash("sha256")
             .update(`${resumeText}::${args.jobTitle}::${args.jobDescription}`)
              .digest("hex");

              let jobMatchScore: number | null = null;
            let jobMatchBreakdown: any = null;
            let jobMatchError: string | null = null;               
            let requiredSkills: { name: string; mandatory: boolean }[] = [];
     
            if (args.jobId) {
        const job = await ctx.runQuery(api.jobs.getJobById, { jobId: args.jobId });
        requiredSkills = (job?.requirements || []).map((r: string) => ({ name: r, mandatory: true }));
      } else if (args.jobDescription) {
        requiredSkills = extractRequirementsFromText(args.jobDescription).map((r) => ({ name: r, mandatory: true }));
      }

      if (args.jobTitle) {
              try {
                const pipeline = new AIPipeline();
                const jobRequirements = {
                  jobRole: args.jobTitle,
                  requiredSkills, // resumeAnalysis.ts currently has no structured requirements list from free-text jobDescription; see note below
                  preferredSkills: [],
                  mandatorySkills: [],
                  certifications: [],
                  educationLevel: "bachelors" as const,
                  educationField: "Not specified",
                  minExperience: 0,
                };
                const result = await pipeline.processResume(resumeText, jobRequirements, args.resumeId);
                jobMatchScore = result.score.overall;
                jobMatchBreakdown = result.score.breakdown;
              } catch (err) {
               console.error("[resumeAnalysis] Job match scoring failed:", err instanceof Error ? err.message : err);
                jobMatchError = err instanceof Error ? err.message : "Unknown error computing job match";
              }
            }

             const cached = await ctx.runQuery(internal.analysisCache.get, { contentHash });
            if (cached) {
              await ctx.runMutation(internal.resumes.completeAnalysis, {
                resumeId: args.resumeId,
                feedback: cached.feedback,
                jobMatchScore: jobMatchScore ?? undefined,
                jobMatchBreakdown: jobMatchBreakdown ?? undefined,
                jobMatchError: jobMatchError ?? undefined,
              });
              return;
            }


      // 3. Call Gemini with model fallback chain
      const prompt = buildPrompt(args.jobTitle, args.jobDescription, resumeText);
      const groqResult = await callGroqWithFallback(prompt);

      let feedback;
    //   if ("error" in geminiResult) {
    //     console.error("[resumeAnalysis] Gemini failed for all models:", geminiResult.error);
    //     feedback = fallbackFeedback(geminiResult.error);
    if ("error" in groqResult) {
        console.error("[resumeAnalysis] Groq failed for all models:", groqResult.error);
        feedback = fallbackFeedback(groqResult.error);
      } else {
        // const cleaned = cleanGeminiResponse(geminiResult.text);
        // feedback = isValidGeminiResponse(cleaned)
        const cleaned = cleanLLMResponse(groqResult.text);
        feedback = isValidFeedbackShape(cleaned)
           ? normalizeFeedback(cleaned)
           : fallbackFeedback(
              `Model "${groqResult.modelUsed}" returned an unexpected format.`
            );
      }

      // 4. Persist. Note: even the fallback path now writes "completed"
      // with a 0-score, explanation-bearing feedback object, NOT a
      // silent generic 55% — the analysisError field also carries the
      // reason for anything reading it directly.
      await ctx.runMutation(internal.resumes.completeAnalysis, {
        resumeId: args.resumeId,
        feedback,
        jobMatchScore: jobMatchScore ?? undefined,
        jobMatchBreakdown: jobMatchBreakdown ?? undefined,
        jobMatchError: jobMatchError ?? undefined,
      });

       if (!("error" in groqResult)) {
        await ctx.runMutation(internal.analysisCache.set, { contentHash, feedback });
      }

      if ("error" in groqResult) {
        await ctx.runMutation(internal.resumes.setAnalysisStatus, {
          resumeId: args.resumeId,
          status: "completed",
          error: groqResult.error,
        });
      }
    } catch (err: any) {
      console.error("[resumeAnalysis.analyzeResume] failed:", err);
      await ctx.runMutation(internal.resumes.setAnalysisStatus, {
        resumeId: args.resumeId,
        status: "failed",
        error: err?.message || "Unknown error during analysis",
      });
    }
  },
});