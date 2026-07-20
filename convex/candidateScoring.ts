"use node";

// convex/candidateScoring.ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { extractResumeText } from "../../resume-matcher/src/app/lib/pdfExtractor";
import { AIPipeline } from "../src/app/lib/ai/AIPipeline";
import type { JobRequirements } from "../src/app/lib/ai/types";
import { sanitizeForPrompt } from "./lib/sanitizeForPrompt";
export const analyzeCandidateApplication = internalAction({
  args: {
    applicationId: v.id("applications"),
    jobId: v.id("jobs"),
    resumeFileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.applications.setApplicationAnalysisStatus, {
        applicationId: args.applicationId,
        status: "processing",
      });

      // 1. Fetch job requirements (public query, no auth required — job
      // postings are public data).
      const job = await ctx.runQuery(api.jobs.getJobById, { jobId: args.jobId });
      if (!job) {
        await ctx.runMutation(internal.applications.setApplicationAnalysisStatus, {
          applicationId: args.applicationId,
          status: "failed",
          error: "Job posting not found.",
        });
        return;
      }

      const jobRequirements: JobRequirements = {
       jobRole: (job.title || "Unspecified Role").slice(0, 200),
        requiredSkills: (job.requirements || []).slice(0, 60).map((r: string) => ({
          name: String(r).slice(0, 200),
          mandatory: true,
        })),
        preferredSkills: [],
        mandatorySkills: [],
        certifications: [],
        educationLevel: "bachelors",
        educationField: "Not specified",
        minExperience: 0,
      };

      // 2. Fetch and extract resume text
      const url = await ctx.storage.getUrl(args.resumeFileId);
      if (!url) {
        await ctx.runMutation(internal.applications.setApplicationAnalysisStatus, {
          applicationId: args.applicationId,
          status: "failed",
          error: "Resume file not found in storage.",
        });
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        await ctx.runMutation(internal.applications.setApplicationAnalysisStatus, {
          applicationId: args.applicationId,
          status: "failed",
          error: `Failed to fetch resume file: ${response.status}`,
        });
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      const buffer = await response.arrayBuffer();

      const extraction = await extractResumeText(buffer, contentType);
      if (!extraction.ok) {
        await ctx.runMutation(internal.applications.setApplicationAnalysisStatus, {
          applicationId: args.applicationId,
          status: "failed",
          error: extraction.error,
        });
        return;
      }

      // 3. Run the same scoring pipeline used for manual analysis — this
      // is the fairness guarantee: identical criteria for every
      // candidate, regardless of whether an employer ever manually
      // reviews them.
      const pipeline = new AIPipeline();
      const result = await pipeline.processResume(
        extraction.text,
        jobRequirements,
        args.applicationId as unknown as string
        // No authToken passed — see file header for the known
        // FeedbackLearning limitation this implies.
      );

      // 4. Persist a compact summary directly on the application record.
      await ctx.runMutation(internal.applications.setApplicationAnalysis, {
        applicationId: args.applicationId,
        matchScore: result.score.overall,
        summary: {
          risk: result.score.risk,
          confidence: result.confidence.score,
          recommendation: result.recommendations[0] || "No recommendation available.",
          topStrengths: (result.score.explainability?.strongestFactors || []).slice(0, 3),
          topWeaknesses: (result.score.explainability?.weakestFactors || []).slice(0, 3),
        },
      });
    } catch (err: any) {
      console.error("[candidateScoring.analyzeCandidateApplication] failed:", err);
      await ctx.runMutation(internal.applications.setApplicationAnalysisStatus, {
        applicationId: args.applicationId,
        status: "failed",
        error: err?.message || "Unknown error during candidate scoring.",
      });
    }
  },
});