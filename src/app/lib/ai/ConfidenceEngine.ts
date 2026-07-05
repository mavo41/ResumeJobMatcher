// lib/ai/ConfidenceEngine.ts
import { ParsedResume, CandidateScore,ConfidenceReport } from './types';




export class ConfidenceEngine {
  analyze(candidate: ParsedResume, score: CandidateScore): ConfidenceReport {
    const factors: ConfidenceReport['factors'] = [];
    let confidence = 70;

    // Positive factors
    if (candidate.skills.length > 10) {
      factors.push({
        name: "Comprehensive Skills",
        impact: 'positive',
        weight: 5,
        description: "Candidate demonstrates a broad skill set",
      });
      confidence += 5;
    }

    if (candidate.experience.years > 5) {
      factors.push({
        name: "Significant Experience",
        impact: 'positive',
        weight: 10,
        description: `${candidate.experience.years} years of professional experience`,
      });
      confidence += 10;
    }

    if (candidate.projects.length > 3) {
      factors.push({
        name: "Strong Portfolio",
        impact: 'positive',
        weight: 5,
        description: "Multiple projects demonstrate practical skills",
      });
      confidence += 5;
    }

    // Negative factors
    if (candidate.skills.length < 5) {
      factors.push({
        name: "Limited Skills",
        impact: 'negative',
        weight: 10,
        description: "Few skills listed, may lack breadth",
      });
      confidence -= 10;
    }

    if (candidate.experience.roles.length === 0) {
      factors.push({
        name: "No Work Experience",
        impact: 'negative',
        weight: 15,
        description: "No professional experience listed",
      });
      confidence -= 15;
    }

    if (score.breakdown.education.score < 50) {
      factors.push({
        name: "Education Gap",
        impact: 'negative',
        weight: 5,
        description: "Education may not meet requirements",
      });
      confidence -= 5;
    }

    if (candidate.projects.length === 0) {
      factors.push({
        name: "No Projects",
        impact: 'negative',
        weight: 5,
        description: "No projects or portfolio found",
      });
      confidence -= 5;
    }

    if (candidate.achievements.length < 3) {
      factors.push({
        name: "Limited Achievements",
        impact: 'neutral',
        weight: 3,
        description: "Few achievements listed, may have more not documented",
      });
    }

    // Generate recommendation
    let recommendation = "";
    if (confidence >= 80) {
      recommendation = "High confidence - Strongly recommend for interview";
    } else if (confidence >= 60) {
      recommendation = "Moderate confidence - Consider for interview with further review";
    } else {
      recommendation = "Low confidence - Review candidate carefully before proceeding";
    }

    return {
      score: Math.min(Math.max(Math.round(confidence), 0), 100),
      factors,
      recommendation,
    };
  }
}