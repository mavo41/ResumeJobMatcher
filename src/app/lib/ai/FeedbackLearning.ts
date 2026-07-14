// lib/ai/FeedbackLearning.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export interface HiringOutcome {
  candidateId: string;
  score: number;
  breakdown: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
    certifications: number;
    achievements: number;
  };
  interviewed: boolean;
  hired: boolean;
  rejected: boolean;
  feedback?: string;
}

export interface ModelWeights {
  skills: number;
  experience: number;
  education: number;
  projects: number;
  certifications: number;
  achievements: number;
}

// Stateless — deliberately does NOT hold outcomes in memory (Issue #5).
// Every call reads/writes directly to Convex, which is the actual
// durable source of truth. This class is now a thin convenience wrapper
// only; the real logic lives in convex/feedback.ts's
// maybeUpdateWeightsFromOutcomes mutation.
export class FeedbackLearning {
  private convex: ConvexHttpClient | null = null;

  constructor(convexUrl?: string) {
    if (convexUrl) {
      this.convex = new ConvexHttpClient(convexUrl);
    }
  }

  async recordOutcome(outcome: HiringOutcome, authToken?: string) {
    if (!this.convex) {
      console.warn("[FeedbackLearning] No Convex client configured — outcome not persisted.");
      return;
    }

    if (authToken) {
      this.convex.setAuth(authToken);
    }

    try {
      await this.convex.mutation(api.feedback.recordOutcome, {
        candidateId: outcome.candidateId,
        score: outcome.score,
        interviewed: outcome.interviewed,
        hired: outcome.hired,
        rejected: outcome.rejected,
        feedback: outcome.feedback,
        breakdown: outcome.breakdown,
      });
    } catch (error) {
      console.warn("[FeedbackLearning] Failed to save outcome to database:", error);
      return;
    }

    // Instead of an in-memory counter, ask Convex directly whether
    // enough real, persisted outcomes now exist to justify recomputing
    // weights. This is correct regardless of how many separate
    // serverless invocations contributed the underlying data.
    try {
      const result = await this.convex.mutation(
        api.feedback.maybeUpdateWeightsFromOutcomes,
        {}
      );
      if (result.triggered) {
        console.log("[FeedbackLearning] Weights updated:", result.newWeights);
      }
    } catch (error) {
      console.warn("[FeedbackLearning] Failed to check/update weights:", error);
    }
  }

  // Helper to convert ScoreBreakdown to simple breakdown — unchanged.
  static convertBreakdown(breakdown: any): HiringOutcome["breakdown"] {
    return {
      skills: typeof breakdown.skills === "number" ? breakdown.skills : breakdown.skills?.score || 0,
      experience:
        typeof breakdown.experience === "number" ? breakdown.experience : breakdown.experience?.score || 0,
      education:
        typeof breakdown.education === "number" ? breakdown.education : breakdown.education?.score || 0,
      projects: typeof breakdown.projects === "number" ? breakdown.projects : breakdown.projects?.score || 0,
      certifications:
        typeof breakdown.certifications === "number"
          ? breakdown.certifications
          : breakdown.certifications?.score || 0,
      achievements:
        typeof breakdown.achievements === "number" ? breakdown.achievements : breakdown.achievements?.score || 0,
    };
  }
}