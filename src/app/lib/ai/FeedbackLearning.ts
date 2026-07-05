// lib/ai/FeedbackLearning.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { ScoreBreakdown } from "./types";

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

export class FeedbackLearning {
  private convex: ConvexHttpClient | null = null;
  private outcomes: HiringOutcome[] = [];
  private weights: ModelWeights = {
    skills: 0.35,
    experience: 0.25,
    education: 0.15,
    projects: 0.12,
    certifications: 0.08,
    achievements: 0.05,
  };

  constructor(convexUrl?: string) {
    if (convexUrl) {
      this.convex = new ConvexHttpClient(convexUrl);
    }
  }

  async recordOutcome(outcome: HiringOutcome) {
    this.outcomes.push(outcome);
    
    // Store in database for persistence
    if (this.convex) {
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
        console.warn("Failed to save outcome to database:", error);
      }
    }

    // If we have enough data, update weights
    if (this.outcomes.length > 20) {
      await this.updateWeights();
    }
  }

  private async updateWeights() {
    const hired = this.outcomes.filter(o => o.hired);
    const rejected = this.outcomes.filter(o => o.rejected);

    if (hired.length < 10) return;

    // Calculate average breakdowns for hired vs rejected
    const hiredAvg = this.calculateAverageBreakdown(hired);
    const rejectedAvg = this.calculateAverageBreakdown(rejected);

    // Determine which categories most differentiate hired from rejected
    const differences: Record<keyof ModelWeights, number> = {
      skills: 0,
      experience: 0,
      education: 0,
      projects: 0,
      certifications: 0,
      achievements: 0,
    };
    let totalDiff = 0;

    for (const key of Object.keys(differences) as Array<keyof ModelWeights>) {
      const diff = hiredAvg[key] - (rejectedAvg[key] || 0);
      differences[key] = Math.abs(diff);
      totalDiff += Math.abs(diff);
    }

    // If there's a significant difference, adjust weights
    if (totalDiff > 20) {
      const newWeights: ModelWeights = { ...this.weights };
      for (const [key, diff] of Object.entries(differences)) {
        const categoryKey = key as keyof ModelWeights;
        // Categories with larger differences get higher weights
        newWeights[categoryKey] = this.weights[categoryKey] + (diff / totalDiff) * 0.1;
      }

      // Normalize weights to sum to 1
      const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
      for (const key of Object.keys(newWeights) as Array<keyof ModelWeights>) {
        newWeights[key] = newWeights[key] / sum;
      }

      this.weights = newWeights;

      // Save to database
      if (this.convex) {
        try {
          await this.convex.mutation(api.feedback.updateWeights, {
            weights: this.weights,
          });
        } catch (error) {
          console.warn("Failed to save weights:", error);
        }
      }

      console.log('Weights updated:', this.weights);
    }
  }

  private calculateAverageBreakdown(outcomes: HiringOutcome[]): HiringOutcome['breakdown'] {
    const avg = {
      skills: 0,
      experience: 0,
      education: 0,
      projects: 0,
      certifications: 0,
      achievements: 0,
    };

    for (const outcome of outcomes) {
      avg.skills += outcome.breakdown.skills;
      avg.experience += outcome.breakdown.experience;
      avg.education += outcome.breakdown.education;
      avg.projects += outcome.breakdown.projects;
      avg.certifications += outcome.breakdown.certifications;
      avg.achievements += outcome.breakdown.achievements;
    }

    const count = outcomes.length || 1;
    for (const key of Object.keys(avg) as Array<keyof typeof avg>) {
      avg[key] = avg[key] / count;
    }

    return avg;
  }

  // Helper to convert ScoreBreakdown to simple breakdown
  static convertBreakdown(breakdown: any): HiringOutcome['breakdown'] {
    return {
      skills: typeof breakdown.skills === 'number' ? breakdown.skills : breakdown.skills?.score || 0,
      experience: typeof breakdown.experience === 'number' ? breakdown.experience : breakdown.experience?.score || 0,
      education: typeof breakdown.education === 'number' ? breakdown.education : breakdown.education?.score || 0,
      projects: typeof breakdown.projects === 'number' ? breakdown.projects : breakdown.projects?.score || 0,
      certifications: typeof breakdown.certifications === 'number' ? breakdown.certifications : breakdown.certifications?.score || 0,
      achievements: typeof breakdown.achievements === 'number' ? breakdown.achievements : breakdown.achievements?.score || 0,
    };
  }

  getWeights(): ModelWeights {
    return { ...this.weights };
  }
}