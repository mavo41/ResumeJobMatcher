// lib/ai/ScoringEngine.ts
// ============================================================
// PART 1: Engine Foundation & Main Orchestration
// ============================================================

import {
  // Core Types
  ParsedResume,
  JobRequirements,
  CandidateScore,
  ScoreBreakdown,
  CategoryScore,
  
  // Decision Types
  MandatorySkillResult,
  HiringRecommendation,
  RiskLevel,
  ResumeQuality,
  
  // Report Types
  ConfidenceReport,
  ConfidenceFactor,
  BiasReport,
  ExplainabilityReport,
  AIReasoning,
  ScoreEvidence,
  
  // Metric Types
  ResumeQualityMetrics,
  ResumeQualityReport,
  ResumeSuggestion,
  ScoringWeights,
  RecruiterPreferences,
  DEFAULT_SCORING_WEIGHTS,
  
  // Supporting Types
  Skill,
  Certification,
  Achievement,
  ExperienceRole,
  Project,
  Education,
  CandidateContact,
  ProfessionalSummary,
  JobSkill,
  JobCertification,
  
  // Enum Types
  EducationLevel,
  Recommendation,
} from "./types";

// AI Service Imports
import { SkillEmbeddings } from "./SkillEmbeddings";
import { SkillSynonyms, SkillMatch } from "./SkillSynonyms";
import { EducationMatcher } from "./EducationMatcher";
import { ExperienceMatcher } from "./ExperienceMatcher";
import { ProjectScorer } from "./ProjectScorer";
import { ResumeQualityAnalyzer } from "./ResumeQualityAnalyzer";

// ============================================================
// Scoring Context Interface
// ============================================================

interface ScoringContext {
  candidate: ParsedResume;
  job: JobRequirements;
  semanticThreshold: number;
  useSemanticMatching: boolean;
  weights: ScoringWeights;
  hiringThresholds: {
    reject: number;
    review: number;
    interview: number;
    strongHire: number;
  };
}

// ============================================================
// ScoringEngine Class Declaration
// ============================================================

export class ScoringEngine {
  // ============================================================
  // Private AI Services
  // ============================================================
  
  private embeddings: SkillEmbeddings;
  private synonyms: SkillSynonyms;
  private educationMatcher: EducationMatcher;
  private experienceMatcher: ExperienceMatcher;
  private projectScorer: ProjectScorer;
  private resumeQualityAnalyzer: ResumeQualityAnalyzer;

  // ============================================================
  // Configuration
  // ============================================================
  
  private semanticThreshold = 0.60;
  private useSemanticMatching = true;
  private weights: ScoringWeights = { ...DEFAULT_SCORING_WEIGHTS };
  private recruiterPreferences?: RecruiterPreferences;

  // ============================================================
  // Hiring Thresholds
  // ============================================================
  
  private hiringThresholds = {
    reject: 45,
    review: 60,
    interview: 75,
    strongHire: 90,
  };

  // ============================================================
  // Constructor
  // ============================================================
  
  constructor(recruiterPreferences?: RecruiterPreferences) {
    this.embeddings = new SkillEmbeddings();
    this.synonyms = new SkillSynonyms();
    this.educationMatcher = new EducationMatcher();
    this.experienceMatcher = new ExperienceMatcher();
    this.projectScorer = new ProjectScorer();
    this.resumeQualityAnalyzer = new ResumeQualityAnalyzer();

    this.recruiterPreferences = recruiterPreferences;

    if (recruiterPreferences?.weights) {
      this.resolveWeights(recruiterPreferences.weights);
    }
  }

  // ============================================================
  // Public Configuration Methods
  // ============================================================

  enableSemanticMatching(): void {
    this.useSemanticMatching = true;
  }

  disableSemanticMatching(): void {
    this.useSemanticMatching = false;
  }

  setSemanticThreshold(value: number): void {
    this.semanticThreshold = Math.min(Math.max(value, 0), 1);
  }

  getSemanticThreshold(): number {
    return this.semanticThreshold;
  }

  resolveWeights(newWeights: Partial<ScoringWeights>): void {
    const updatedWeights: ScoringWeights = {
      skills: typeof newWeights.skills === 'number' ? newWeights.skills : this.weights.skills,
      experience: typeof newWeights.experience === 'number' ? newWeights.experience : this.weights.experience,
      education: typeof newWeights.education === 'number' ? newWeights.education : this.weights.education,
      projects: typeof newWeights.projects === 'number' ? newWeights.projects : this.weights.projects,
      certifications: typeof newWeights.certifications === 'number' ? newWeights.certifications : this.weights.certifications,
      achievements: typeof newWeights.achievements === 'number' ? newWeights.achievements : this.weights.achievements,
      resumeQuality: typeof newWeights.resumeQuality === 'number' ? newWeights.resumeQuality : this.weights.resumeQuality,
    };

    this.weights = updatedWeights;
  }

  getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  private getNormalizedWeights(): { [K in keyof ScoringWeights]: number } {
    const total = Object.values(this.weights).reduce((sum: number, w: number) => sum + w, 0);
    if (total === 0) return { ...this.weights };
    
    return {
      skills: this.weights.skills / total,
      experience: this.weights.experience / total,
      education: this.weights.education / total,
      projects: this.weights.projects / total,
      certifications: this.weights.certifications / total,
      achievements: this.weights.achievements / total,
      resumeQuality: this.weights.resumeQuality / total,
    };
  }

  setHiringThresholds(thresholds: Partial<typeof this.hiringThresholds>): void {
    this.hiringThresholds = {
      ...this.hiringThresholds,
      ...thresholds,
    };
  }

  // ============================================================
  // Resume Quality Report Mapping
  // ============================================================

  private mapResumeQualityReport(analyzerReport: any): ResumeQualityReport {
    const metrics = analyzerReport.metrics || this.getDefaultResumeQualityMetrics();
    return {
      quality: this.getResumeQualityLevel(metrics.overall || 0),
      metrics: metrics,
      strengths: analyzerReport.strengths || [],
      weaknesses: analyzerReport.weaknesses || [],
      suggestions: this.generateResumeSuggestions(metrics),
    };
  }

  private getDefaultResumeQualityMetrics(): ResumeQualityMetrics {
    return {
      structure: 0,
      professionalism: 0,
      formatting: 0,
      grammar: 0,
      readability: 0,
      atsCompatibility: 0,
      keywordCoverage: 0,
      completeness: 0,
      projectQuality: 0,
      experienceQuality: 0,
      educationQuality: 0,
      achievementsQuality: 0,
      contactCompleteness: 0,
      overall: 0,
    };
  }

  // ============================================================
  // MAIN ORCHESTRATION: scoreCandidate()
  // ============================================================

  async scoreCandidate(
    candidate: ParsedResume,
    job: JobRequirements
  ): Promise<CandidateScore> {
    this.validateInputs(candidate, job);

    const context = this.initializeContext(candidate, job);

    const mandatoryResult = this.evaluateMandatorySkills(candidate, job);

    const analyzerReport = this.resumeQualityAnalyzer.analyze(candidate);
    const resumeQualityReport = this.mapResumeQualityReport(analyzerReport);
    
    const [
      skillsResult,
      experienceResult,
      educationResult,
      projectsResult,
      certificationsResult,
      achievementsResult,
    ] = await Promise.all([
      this.calculateSkillsScore(context),
      this.calculateExperienceScore(context),
      this.calculateEducationScore(context),
      this.calculateProjectsScore(context),
      this.calculateCertificationScore(context),
      this.calculateAchievementScore(context),
    ]);

    const resumeQualityCategoryScore: CategoryScore = {
      score: resumeQualityReport.metrics.overall,
      weight: this.weights.resumeQuality || 0.03,
      confidence: 80,
      matchedItems: ['Resume evaluated'],
      missingItems: [],
      evidence: [`Resume quality score: ${resumeQualityReport.metrics.overall}/100`],
      explanation: `Resume quality assessed at ${resumeQualityReport.metrics.overall}/100`,
    };

    const breakdown = this.buildBreakdown(
      skillsResult,
      experienceResult,
      educationResult,
      projectsResult,
      certificationsResult,
      achievementsResult,
      resumeQualityCategoryScore
    );

    let overall = this.calculateOverallScore(breakdown);

    if (!mandatoryResult.passed) {
      const penalty = Math.min(mandatoryResult.missingSkills.length * 15, 50);
      overall = Math.max(overall - penalty, 0);
    }

    const confidence = this.calculateConfidence(candidate, breakdown);

    const hiringRisk = this.calculateHiringRisk(candidate, breakdown, mandatoryResult);

    const recommendation = this.generateRecommendation(overall, confidence.score, hiringRisk.level);

    const strengths = this.identifyStrengths(breakdown, candidate);
    const weaknesses = this.identifyWeaknesses(breakdown, candidate, mandatoryResult);

    const explanation = this.generateExplanation(breakdown, strengths, weaknesses, recommendation);

    const explainability = this.buildExplainabilityReport(breakdown, candidate, job);

    const biasReport = this.generateBiasReport(candidate);

    return this.buildCandidateScore(
      overall,
      breakdown,
      confidence,
      hiringRisk,
      recommendation,
      explanation,
      mandatoryResult,
      resumeQualityReport,
      strengths,
      weaknesses,
      explainability,
      biasReport
    );
  }

  // ============================================================
  // Utility: Input Validation
  // ============================================================

  private validateInputs(candidate: ParsedResume, job: JobRequirements): void {
    if (!candidate) {
      throw new Error('Candidate resume is required');
    }
    if (!job) {
      throw new Error('Job requirements are required');
    }
    if (!job.jobRole && (!job.requiredSkills || job.requiredSkills.length === 0)) {
      throw new Error('Job must have either a role or required skills');
    }
  }

  // ============================================================
  // Utility: Scoring Context
  // ============================================================

  private initializeContext(candidate: ParsedResume, job: JobRequirements): ScoringContext {
    return {
      candidate,
      job,
      semanticThreshold: this.semanticThreshold,
      useSemanticMatching: this.useSemanticMatching,
      weights: this.weights,
      hiringThresholds: this.hiringThresholds,
    };
  }

  // ============================================================
  // Utility: Build CandidateScore
  // ============================================================

  private buildCandidateScore(
    overall: number,
    breakdown: ScoreBreakdown,
    confidence: ConfidenceReport,
    hiringRisk: { level: RiskLevel; reasons: string[]; score: number },
    recommendation: Recommendation,
    explanation: string,
    mandatoryResult: MandatorySkillResult,
    resumeQualityReport: ResumeQualityReport,
    strengths: string[],
    weaknesses: string[],
    explainability: ExplainabilityReport,
    biasReport: BiasReport
  ): CandidateScore {
    const hiringRiskReport = {
      level: hiringRisk.level,
      score: hiringRisk.score,
      reasons: hiringRisk.reasons.map((reason: string) => ({
        title: 'Risk Factor',
        description: reason,
        severity: hiringRisk.level,
      })),
    };

    return {
      overall,
      breakdown,
      confidence,
      risk: hiringRisk.level,
      riskReasons: hiringRisk.reasons,
      explanation,
      recommendation,
      mandatorySkills: mandatoryResult,
      resumeQuality: resumeQualityReport,
      explainability,
      hiringRisk: hiringRiskReport,
      biasReport,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // END OF PART 1
  // ============================================================

  // ============================================================
  // PART 2: Core AI Scoring Pipeline
  // ============================================================

  // ============================================================
  // 2.1: Mandatory Skills Evaluation
  // ============================================================

  private evaluateMandatorySkills(
    candidate: ParsedResume,
    job: JobRequirements
  ): MandatorySkillResult {
    const candidateSkills = candidate.skills.map((s: Skill) => s.name);
    // FIX: SkillMatch uses 'normalized' property, not 'canonical'
    const normalizedMatches = this.synonyms.normalizeSkills(candidateSkills);
    const normalizedCandidate = normalizedMatches.map((match: SkillMatch) => match.normalized);
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const mandatory of job.mandatorySkills) {
      const mandatoryName = mandatory.name;
      const canonical = this.synonyms.getCanonical(mandatoryName);
      const found = normalizedCandidate.some((s: string) => s === canonical);
      if (found) {
        matchedSkills.push(mandatoryName);
      } else {
        missingSkills.push(mandatoryName);
      }
    }

    const passed = missingSkills.length === 0;
    const matchPercentage = job.mandatorySkills.length > 0
      ? (matchedSkills.length / job.mandatorySkills.length) * 100
      : 100;

    return {
      passed,
      matchedSkills,
      missingSkills,
      score: matchPercentage,
      matchPercentage,
      autoRejected: !passed && missingSkills.length >= 2,
      skill: passed ? 'All mandatory skills met' : 'Missing mandatory skills',
      explanation: passed
        ? 'All mandatory skills verified'
        : `Missing required skills: ${missingSkills.join(', ')}`,
    };
  }

  // ============================================================
  // 2.2: Skills Score Calculation
  // ============================================================

  private async calculateSkillsScore(
    context: ScoringContext
  ): Promise<CategoryScore> {
    const { candidate, job } = context;
    const candidateSkillNames = candidate.skills.map((s: Skill) => s.name);
    const requiredSkills = job.requiredSkills.map((s: JobSkill) => s.name);
    const preferredSkills = job.preferredSkills.map((s: JobSkill) => s.name);

    // FIX: SkillMatch uses 'normalized' property
    const normalizedMatches = this.synonyms.normalizeSkills(candidateSkillNames);
    const normalizedCandidate = normalizedMatches.map((match: SkillMatch) => match.normalized);
    
    const requiredMatches = this.synonyms.normalizeSkills(requiredSkills);
    const normalizedRequired = requiredMatches.map((match: SkillMatch) => match.normalized);
    
    const preferredMatches = this.synonyms.normalizeSkills(preferredSkills);
    const normalizedPreferred = preferredMatches.map((match: SkillMatch) => match.normalized);

    let matchedRequired: string[] = [];
    let missingRequired: string[] = [];
    let matchedPreferred: string[] = [];
    let score = 0;
    let confidence = 0;

    if (this.useSemanticMatching) {
      const allSkills = [...normalizedCandidate, ...normalizedRequired, ...normalizedPreferred];
      const embeddingsMap = await this.embeddings.getEmbeddingsBatch(allSkills);

      for (const required of normalizedRequired) {
        const requiredEmbedding = embeddingsMap.get(required);
        if (!requiredEmbedding) continue;

        let bestMatch = false;
        let bestSimilarity = 0;
        let bestMatchSkill = '';

        for (const candidateSkill of normalizedCandidate) {
          const candidateEmbedding = embeddingsMap.get(candidateSkill);
          if (!candidateEmbedding) continue;

          const similarity = this.cosineSimilarity(requiredEmbedding, candidateEmbedding);
          const threshold = this.getSkillThreshold(required);
          
          if (similarity > threshold && similarity > bestSimilarity) {
            bestMatch = true;
            bestSimilarity = similarity;
            bestMatchSkill = candidateSkill;
          }
        }

        if (bestMatch) {
          matchedRequired.push(required);
        } else {
          missingRequired.push(required);
        }
      }

      for (const preferred of normalizedPreferred) {
        const preferredEmbedding = embeddingsMap.get(preferred);
        if (!preferredEmbedding) continue;

        for (const candidateSkill of normalizedCandidate) {
          const candidateEmbedding = embeddingsMap.get(candidateSkill);
          if (!candidateEmbedding) continue;

          const similarity = this.cosineSimilarity(preferredEmbedding, candidateEmbedding);
          if (similarity > 0.4) {
            matchedPreferred.push(preferred);
            break;
          }
        }
      }

      confidence = 90;
    } else {
      for (const required of normalizedRequired) {
        const found = normalizedCandidate.some((s: string) => s === required);
        if (found) {
          matchedRequired.push(required);
        } else {
          missingRequired.push(required);
        }
      }

      for (const preferred of normalizedPreferred) {
        if (normalizedCandidate.some((s: string) => s === preferred)) {
          matchedPreferred.push(preferred);
        }
      }

      confidence = 70;
    }

    const requiredScore = normalizedRequired.length > 0
      ? (matchedRequired.length / normalizedRequired.length) * 70
      : 0;
    const preferredScore = normalizedPreferred.length > 0
      ? (matchedPreferred.length / normalizedPreferred.length) * 30
      : 0;

    score = requiredScore + preferredScore;

    const evidence: string[] = [];
    if (matchedRequired.length > 0) {
      evidence.push(`Matched required skills: ${matchedRequired.slice(0, 3).join(', ')}`);
    }
    if (missingRequired.length > 0) {
      evidence.push(`Missing required skills: ${missingRequired.slice(0, 3).join(', ')}`);
    }

    return {
      score: Math.min(Math.round(score), 100),
      weight: this.weights.skills,
      confidence: Math.round(confidence),
      matchedItems: matchedRequired,
      missingItems: missingRequired,
      evidence,
      explanation: `Skills: ${matchedRequired.length}/${normalizedRequired.length} required matched. ${matchedPreferred.length}/${normalizedPreferred.length} preferred matched.`,
    };
  }

  // ============================================================
  // 2.3: Experience Score Calculation
  // ============================================================

  private async calculateExperienceScore(
    context: ScoringContext
  ): Promise<CategoryScore> {
    const { candidate, job } = context;
    const roles = candidate.experience.roles;
    const totalYears = candidate.experience.years;

    let score = 0;
    let matchedItems: string[] = [];
    let missingItems: string[] = [];

    if (totalYears >= job.minExperience) {
      score = 70 + Math.min((totalYears - job.minExperience) * 5, 30);
    } else {
      score = (totalYears / Math.max(job.minExperience, 1)) * 70;
    }

    let roleMatchCount = 0;
    for (const role of roles) {
      const result = await this.experienceMatcher.matchRole(role.title, job.jobRole);
      if (result.match) {
        roleMatchCount++;
        matchedItems.push(`${role.title} (${role.company})`);
      }
    }

    if (roles.length > 0 && roleMatchCount === 0) {
      missingItems.push(`No roles matching "${job.jobRole}"`);
    }

    if (roleMatchCount > 0) {
      const bonus = Math.min(roleMatchCount * 5, 15);
      score = Math.min(score + bonus, 100);
    }

    const evidence: string[] = [
      `${totalYears} years of experience (required: ${job.minExperience})`,
      `${roles.length} roles listed`,
    ];

    if (roleMatchCount > 0) {
      evidence.push(`${roleMatchCount} roles match "${job.jobRole}"`);
    }

    return {
      score: Math.round(score),
      weight: this.weights.experience,
      confidence: roles.length > 0 ? 85 : 40,
      matchedItems,
      missingItems,
      evidence,
      explanation: `Experience: ${totalYears} years, ${roleMatchCount}/${roles.length} roles match.`,
    };
  }

  // ============================================================
  // 2.4: Education Score Calculation
  // ============================================================

  private async calculateEducationScore(
    context: ScoringContext
  ): Promise<CategoryScore> {
    const { candidate, job } = context;
    const education = candidate.education;
    let score = 0;
    let matchedItems: string[] = [];
    let missingItems: string[] = [];

    if (education.degree) {
      const fieldMatch = await this.educationMatcher.matchEducation(
        education.degree,
        education.field,
        job.educationField
      );

      const levelMatch = this.educationMatcher.scoreEducationLevel(
        education.level,
        job.educationLevel
      );

      score = (fieldMatch.score * 0.6 + levelMatch.score * 0.4);

      if (fieldMatch.matched) {
        matchedItems.push(`${education.field} matches ${job.educationField}`);
      } else {
        missingItems.push(`${education.field} does not match ${job.educationField}`);
      }

      matchedItems.push(`${education.degree} (${education.institution})`);
    } else {
      score = 20;
      missingItems.push('No education information provided');
    }

    const evidence: string[] = [
      education.degree ? `${education.degree} in ${education.field}` : 'No degree listed',
      education.institution || 'No institution listed',
    ];

    return {
      score: Math.round(score),
      weight: this.weights.education,
      confidence: education.degree ? 80 : 30,
      matchedItems,
      missingItems,
      evidence,
      explanation: `Education: ${education.degree || 'No degree'} in ${education.field || 'unknown field'}`,
    };
  }

  // ============================================================
  // 2.5: Projects Score Calculation
  // ============================================================

  private calculateProjectsScore(
    context: ScoringContext
  ): CategoryScore {
    const { candidate } = context;
    const projectsForScorer = candidate.projects.map((p: Project) => ({
      name: p.name,
      description: p.description,
      technologies: p.technologies.map((t: Skill) => t.name),
      url: p.githubUrl || p.liveUrl,
    }));
    
    const result = this.projectScorer.scoreProjects(projectsForScorer);

    const matchedItems: string[] = [];
    const missingItems: string[] = [];

    if (candidate.projects.length > 0) {
      matchedItems.push(`${candidate.projects.length} projects evaluated`);
      for (const project of candidate.projects.slice(0, 2)) {
        matchedItems.push(`"${project.name}" (${project.technologies.length} technologies)`);
      }
    } else {
      missingItems.push('No projects listed');
    }

    return {
      score: result.score,
      weight: this.weights.projects,
      confidence: candidate.projects.length > 0 ? 75 : 20,
      matchedItems,
      missingItems,
      evidence: result.details,
      explanation: `Projects: ${candidate.projects.length} projects, score ${result.score}/100`,
    };
  }

  // ============================================================
  // 2.6: Certification Score Calculation
  // ============================================================

  private calculateCertificationScore(
    context: ScoringContext
  ): CategoryScore {
    const { candidate, job } = context;
    const certifications = candidate.certifications;
    const required = job.certifications || [];

    let matchedItems: string[] = [];
    let missingItems: string[] = [];

    if (required.length === 0) {
      return {
        score: 100,
        weight: this.weights.certifications,
        confidence: 100,
        matchedItems: ['No certifications required'],
        missingItems: [],
        evidence: ['No certifications required for this role'],
        explanation: 'No certifications required',
      };
    }

    const candidateCertNames = certifications.map((c: Certification) => c.name.toLowerCase());

    for (const req of required) {
      const reqName = req.name;
      const found = candidateCertNames.some((name: string) =>
        name.includes(reqName.toLowerCase()) || reqName.toLowerCase().includes(name)
      );
      if (found) {
        matchedItems.push(reqName);
      } else {
        missingItems.push(reqName);
      }
    }

    const score = required.length > 0
      ? (matchedItems.length / required.length) * 100
      : 100;

    return {
      score: Math.round(score),
      weight: this.weights.certifications,
      confidence: certifications.length > 0 ? 80 : 30,
      matchedItems,
      missingItems,
      evidence: [`${matchedItems.length}/${required.length} required certifications matched`],
      explanation: `Certifications: ${matchedItems.length}/${required.length} matched`,
    };
  }

  // ============================================================
  // 2.7: Achievement Score Calculation
  // ============================================================

  private calculateAchievementScore(
    context: ScoringContext
  ): CategoryScore {
    const { candidate } = context;
    const achievements = candidate.achievements || [];
    let score = 0;
    let matchedItems: string[] = [];
    let missingItems: string[] = [];

    if (achievements.length === 0) {
      return {
        score: 20,
        weight: this.weights.achievements,
        confidence: 20,
        matchedItems: [],
        missingItems: ['No achievements listed'],
        evidence: ['No achievements found'],
        explanation: 'No achievements listed',
      };
    }

    let quantifiableCount = 0;
    const impactPatterns = /award|winner|recognition|promotion|top|best|employee|%|increase|decrease|improvement|boost/i;

    for (const achievement of achievements) {
      if (impactPatterns.test(achievement.description || achievement.title)) {
        quantifiableCount++;
      }
    }

    const quantityScore = Math.min(achievements.length * 10, 50);
    const qualityScore = Math.min(quantifiableCount * 10, 30);
    const bonus = achievements.length > 3 ? 20 : 0;

    score = quantityScore + qualityScore + bonus;

    matchedItems = achievements.slice(0, 3).map((a: Achievement) => a.title);
    if (achievements.length > 3) {
      matchedItems.push(`+${achievements.length - 3} more`);
    }

    return {
      score: Math.min(Math.round(score), 100),
      weight: this.weights.achievements,
      confidence: Math.min(50 + achievements.length * 5, 90),
      matchedItems,
      missingItems,
      evidence: [`${achievements.length} achievements, ${quantifiableCount} quantifiable`],
      explanation: `Achievements: ${achievements.length} listed, ${quantifiableCount} quantifiable`,
    };
  }

  // ============================================================
  // 2.8: Build Breakdown
  // ============================================================

  private buildBreakdown(
    skills: CategoryScore,
    experience: CategoryScore,
    education: CategoryScore,
    projects: CategoryScore,
    certifications: CategoryScore,
    achievements: CategoryScore,
    resumeQuality: CategoryScore
  ): ScoreBreakdown {
    return {
      skills,
      experience,
      education,
      projects,
      certifications,
      achievements,
      resumeQuality,
    };
  }

  // ============================================================
  // END OF PART 2
  // ============================================================

  // ============================================================
  // PART 3: AI Decision Intelligence
  // ============================================================

  private calculateOverallScore(breakdown: ScoreBreakdown): number {
    const normalizedWeights = this.getNormalizedWeights();
    const total =
      breakdown.skills.score * normalizedWeights.skills +
      breakdown.experience.score * normalizedWeights.experience +
      breakdown.education.score * normalizedWeights.education +
      breakdown.projects.score * normalizedWeights.projects +
      breakdown.certifications.score * normalizedWeights.certifications +
      breakdown.achievements.score * normalizedWeights.achievements +
      (breakdown.resumeQuality?.score || 0) * (normalizedWeights.resumeQuality || 0);

    return Math.round(total);
  }

  private calculateConfidence(
    candidate: ParsedResume,
    breakdown: ScoreBreakdown
  ): ConfidenceReport {
    const factors: ConfidenceFactor[] = [];
    let confidence = 70;

    if (candidate.skills.length > 10) {
      confidence += 10;
      factors.push({
        name: 'Comprehensive Skills',
        impact: 'positive',
        weight: 10,
        description: 'Broad skill set enhances confidence',
      });
    }

    if (candidate.experience.roles.length > 2) {
      confidence += 10;
      factors.push({
        name: 'Rich Experience',
        impact: 'positive',
        weight: 10,
        description: 'Multiple roles provide strong context',
      });
    }

    if (candidate.projects.length > 2) {
      confidence += 5;
      factors.push({
        name: 'Project Portfolio',
        impact: 'positive',
        weight: 5,
        description: 'Projects demonstrate practical skills',
      });
    }

    if (candidate.skills.length < 5) {
      confidence -= 15;
      factors.push({
        name: 'Limited Skills',
        impact: 'negative',
        weight: 15,
        description: 'Few skills reduce confidence',
      });
    }

    if (candidate.experience.roles.length === 0) {
      confidence -= 20;
      factors.push({
        name: 'No Experience',
        impact: 'negative',
        weight: 20,
        description: 'No work experience listed',
      });
    }

    if (!candidate.education?.degree) {
      confidence -= 10;
      factors.push({
        name: 'Missing Education',
        impact: 'negative',
        weight: 10,
        description: 'Education not provided',
      });
    }

    const avgCategoryConfidence = (
      breakdown.skills.confidence +
      breakdown.experience.confidence +
      breakdown.education.confidence +
      breakdown.projects.confidence +
      breakdown.certifications.confidence +
      breakdown.achievements.confidence
    ) / 6;

    confidence = (confidence + avgCategoryConfidence) / 2;

    const finalConfidence = Math.min(Math.max(Math.round(confidence), 0), 100);

    return {
      score: finalConfidence,
      factors,
      recommendation: finalConfidence > 80
        ? 'High confidence - Trust the recommendation'
        : finalConfidence > 60
        ? 'Moderate confidence - Consider additional review'
        : 'Low confidence - Verify information before deciding',
    };
  }

  private calculateHiringRisk(
    candidate: ParsedResume,
    breakdown: ScoreBreakdown,
    mandatoryResult: MandatorySkillResult
  ): { level: RiskLevel; reasons: string[]; score: number } {
    const reasons: string[] = [];
    let riskScore = 0;

    if (mandatoryResult.missingSkills.length > 0) {
      riskScore += 30;
      reasons.push(`Missing mandatory skills: ${mandatoryResult.missingSkills.join(', ')}`);
    }

    if (candidate.experience.years < 2) {
      riskScore += 20;
      reasons.push('Limited work experience');
    }

    if (candidate.skills.length < 5) {
      riskScore += 15;
      reasons.push('Limited skills listed');
    }

    if (candidate.projects.length === 0) {
      riskScore += 10;
      reasons.push('No projects or portfolio found');
    }

    if (!candidate.education?.degree) {
      riskScore += 15;
      reasons.push('No education information provided');
    }

    if (breakdown.skills.score < 40) {
      riskScore += 10;
      reasons.push('Skills do not strongly match requirements');
    }

    let level: RiskLevel;
    if (riskScore > 50) {
      level = 'HIGH';
    } else if (riskScore > 25) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    return {
      level,
      reasons,
      score: riskScore,
    };
  }

  private generateRecommendation(
    overall: number,
    confidence: number,
    risk: RiskLevel
  ): Recommendation {
    let decision: HiringRecommendation['recommendation'];

    if (overall >= 90 && confidence >= 80 && risk !== 'HIGH') {
      decision = 'Hire';
    } else if (overall >= 75 && confidence >= 70 && risk !== 'HIGH') {
      decision = 'Strong Interview';
    } else if (overall >= 60 && confidence >= 50) {
      decision = 'Interview';
    } else if (overall >= 45 && risk !== 'HIGH') {
      decision = 'Review';
    } else {
      decision = 'Reject';
    }

    const reasons: string[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (overall >= 75) {
      reasons.push('Strong overall match');
      strengths.push('High overall score');
    }
    if (confidence >= 70) {
      reasons.push('High confidence in assessment');
    }
    if (risk === 'LOW') {
      reasons.push('Low risk candidate');
    }
    if (overall < 60) {
      reasons.push('Score below threshold');
      weaknesses.push('Low overall score');
    }
    if (risk === 'HIGH') {
      reasons.push('High risk factors identified');
      weaknesses.push('High risk factors');
    }

    const hiringRecommendation: HiringRecommendation = {
      recommendation: decision,
      confidence: confidence,
      reasons: reasons.length > 0 ? reasons : ['No specific recommendation reasons'],
      sourced: 0,
      applied: 0,
      interviewed: 0,
      offered: 0,
      hired: 0,
    };

    return {
      decision: hiringRecommendation,
      confidence: confidence,
      reasons: hiringRecommendation.reasons,
      strengths: strengths.length > 0 ? strengths : ['Basic qualifications met'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['No significant weaknesses identified'],
      nextAction: this.generateNextAction(decision, risk),
    };
  }

  private generateNextAction(
    decision: HiringRecommendation['recommendation'],
    risk: RiskLevel
  ): string {
    switch (decision) {
      case 'Hire':
        return 'Proceed with offer process';
      case 'Strong Interview':
        return 'Schedule technical interview';
      case 'Interview':
        return 'Schedule screening interview';
      case 'Review':
        return 'Review candidate portfolio and experience';
      case 'Reject':
        return risk === 'HIGH' ? 'Reject due to high risk factors' : 'Reject - does not meet minimum requirements';
      default:
        return 'Review candidate further';
    }
  }

  private buildExplainabilityReport(
    breakdown: ScoreBreakdown,
    candidate: ParsedResume,
    job: JobRequirements
  ): ExplainabilityReport {
    const reasoning: AIReasoning[] = [];
    const strongestFactors: string[] = [];
    const weakestFactors: string[] = [];
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const semanticMatches: Array<{ required: string; matched: string; similarity: number }> = [];

    const categoryKeys = Object.keys(breakdown).filter(
      k => k !== 'resumeQuality'
    ) as Array<keyof Omit<ScoreBreakdown, 'resumeQuality'>>;

    for (const key of categoryKeys) {
      const value = breakdown[key];
      const category = String(key);
      
      const evidence: ScoreEvidence[] = value.evidence.map((e: string) => ({
        category: key,
        title: `${category} Evidence`,
        description: e,
        impact: value.score / 100,
        confidence: value.confidence,
      }));

      reasoning.push({
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Analysis`,
        explanation: value.explanation || `${category} scored ${value.score}%`,
        evidence,
        confidence: value.confidence,
      });

      if (value.score >= 70) {
        strongestFactors.push(`${category} (${value.score}%)`);
      } else if (value.score < 40) {
        weakestFactors.push(`${category} (${value.score}%)`);
      }

      matchedSkills.push(...value.matchedItems);
      missingSkills.push(...value.missingItems);
    }

    if (breakdown.resumeQuality) {
      const rq = breakdown.resumeQuality;
      reasoning.push({
        title: 'Resume Quality Analysis',
        explanation: rq.explanation || `Resume quality scored ${rq.score}%`,
        evidence: [],
        confidence: rq.confidence,
      });
    }

    const candidateSkills = candidate.skills.map((s: Skill) => s.name);
    const requiredSkills = job.requiredSkills.map((s: JobSkill) => s.name);
    
    for (const required of requiredSkills) {
      for (const candidateSkill of candidateSkills) {
        if (candidateSkill.toLowerCase().includes(required.toLowerCase()) ||
            required.toLowerCase().includes(candidateSkill.toLowerCase())) {
          semanticMatches.push({
            required,
            matched: candidateSkill,
            similarity: 0.9,
          });
          break;
        }
      }
    }

    const overall = this.calculateOverallScore(breakdown);

    return {
      summary: `Candidate scored ${overall}% overall. ${strongestFactors.length > 0 ? `Strongest: ${strongestFactors.join(', ')}` : ''} ${weakestFactors.length > 0 ? `Weakest: ${weakestFactors.join(', ')}` : ''}`,
      reasoning,
      strongestFactors,
      weakestFactors,
      matchedSkills,
      missingSkills,
      semanticMatches,
    };
  }

  private generateBiasReport(candidate: ParsedResume): BiasReport {
    const summaryText = candidate.summary?.summary || '';
    const hasIssues = /\b(young|old|male|female|married|single|age|gender|race|religion)\b/i.test(summaryText);

    return {
      score: hasIssues ? 80 : 100,
      passed: !hasIssues,
      anonymized: 'Resume evaluated using skills, experience, education, and projects only.',
    };
  }

  // ============================================================
  // END OF PART 3
  // ============================================================

  // ============================================================
  // PART 4: Intelligence Helpers, Utilities & Finalization
  // ============================================================

  private identifyStrengths(breakdown: ScoreBreakdown, candidate: ParsedResume): string[] {
    const strengths: string[] = [];

    if (breakdown.skills.score >= 70) strengths.push(`Skills (${breakdown.skills.score}%)`);
    if (breakdown.experience.score >= 70) strengths.push(`Experience (${breakdown.experience.score}%)`);
    if (breakdown.education.score >= 70) strengths.push(`Education (${breakdown.education.score}%)`);
    if (breakdown.projects.score >= 70) strengths.push(`Projects (${breakdown.projects.score}%)`);
    if (candidate.skills.length > 10) strengths.push('Broad skill set');
    if (candidate.experience.roles.length > 3) strengths.push('Progressive career experience');
    if (candidate.projects.length > 3) strengths.push('Strong project portfolio');
    if (candidate.achievements && candidate.achievements.length > 3) strengths.push('Notable achievements');

    return strengths.length > 0 ? strengths : ['Basic qualifications met'];
  }

  private identifyWeaknesses(
    breakdown: ScoreBreakdown,
    candidate: ParsedResume,
    mandatoryResult: MandatorySkillResult
  ): string[] {
    const weaknesses: string[] = [];

    if (breakdown.skills.score < 40) weaknesses.push(`Skills need improvement (${breakdown.skills.score}%)`);
    if (breakdown.experience.score < 40) weaknesses.push(`Experience below requirements (${breakdown.experience.score}%)`);
    if (breakdown.education.score < 40) weaknesses.push(`Education may not meet requirements (${breakdown.education.score}%)`);
    if (breakdown.projects.score < 40) weaknesses.push(`Limited project experience (${breakdown.projects.score}%)`);
    if (mandatoryResult.missingSkills.length > 0) weaknesses.push(`Missing skills: ${mandatoryResult.missingSkills.join(', ')}`);
    if (candidate.skills.length < 5) weaknesses.push('Limited skills listed');
    if (candidate.experience.roles.length === 0) weaknesses.push('No work experience');
    if (!candidate.education?.degree) weaknesses.push('No education listed');
    if (candidate.projects.length === 0) weaknesses.push('No projects listed');

    return weaknesses.length > 0 ? weaknesses : ['No significant weaknesses identified'];
  }

  private getResumeQualityLevel(score: number): ResumeQuality {
    if (score >= 85) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'FAIR';
    return 'POOR';
  }

  private generateResumeSuggestions(quality: ResumeQualityMetrics): ResumeSuggestion[] {
    const suggestions: ResumeSuggestion[] = [];

    if (quality.structure < 60) {
      suggestions.push({
        category: 'format',
        priority: 'HIGH',
        title: 'Improve Resume Structure',
        description: 'Add clear sections for skills, experience, education, and projects',
      });
    }

    if (quality.completeness < 60) {
      suggestions.push({
        category: 'experience',
        priority: 'HIGH',
        title: 'Complete Missing Sections',
        description: 'Add missing sections to improve completeness',
      });
    }

    if (quality.atsCompatibility < 60) {
      suggestions.push({
        category: 'ats',
        priority: 'MEDIUM',
        title: 'Improve ATS Compatibility',
        description: 'Use standard section headers and include relevant keywords',
      });
    }

    if (quality.keywordCoverage < 50) {
      suggestions.push({
        category: 'skills',
        priority: 'MEDIUM',
        title: 'Improve Keyword Coverage',
        description: 'Add more relevant keywords from the job description',
      });
    }

    if (quality.projectQuality < 40) {
      suggestions.push({
        category: 'projects',
        priority: 'MEDIUM',
        title: 'Add Projects',
        description: 'Include relevant projects to demonstrate practical skills',
      });
    }

    return suggestions;
  }

  private generateExplanation(
    breakdown: ScoreBreakdown,
    strengths: string[],
    weaknesses: string[],
    recommendation: Recommendation
  ): string {
    const parts: string[] = [];

    const normalizedWeights = this.getNormalizedWeights();
    const overallScore = Math.round(
      breakdown.skills.score * normalizedWeights.skills +
      breakdown.experience.score * normalizedWeights.experience +
      breakdown.education.score * normalizedWeights.education +
      breakdown.projects.score * normalizedWeights.projects +
      breakdown.certifications.score * normalizedWeights.certifications +
      breakdown.achievements.score * normalizedWeights.achievements
    );

    parts.push(`Overall Score: ${overallScore}%`);

    if (strengths.length > 0) {
      parts.push(`Strengths: ${strengths.slice(0, 3).join(', ')}`);
    }

    if (weaknesses.length > 0) {
      parts.push(`Areas for improvement: ${weaknesses.slice(0, 3).join(', ')}`);
    }

    parts.push(`Recommendation: ${recommendation.decision.recommendation}`);
    if (recommendation.reasons.length > 0) {
      parts.push(`Reasons: ${recommendation.reasons.join(', ')}`);
    }

    return parts.join('. ');
  }

  private getSkillThreshold(skill: string): number {
    const programmingPatterns = /react|node|python|java|typescript|javascript|go|rust|c\+\+|c#/i;
    const frameworkPatterns = /django|express|spring|rails|laravel|flask|fastapi/i;
    const conceptPatterns = /architecture|design|pattern|principle|algorithm|data\s+structure/i;
    const softPatterns = /leadership|communication|teamwork|collaboration|problem\s+solving/i;

    if (programmingPatterns.test(skill)) return 0.85;
    if (frameworkPatterns.test(skill)) return 0.75;
    if (conceptPatterns.test(skill)) return 0.60;
    if (softPatterns.test(skill)) return 0.50;
    return 0.60;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  private normalizeScore(score: number): number {
    return Math.min(Math.max(score, 0), 100);
  }

  private calculatePercentage(part: number, total: number): number {
    return total > 0 ? (part / total) * 100 : 0;
  }

  private extractSkillNames(skills: Skill[]): string[] {
    return skills.map((s: Skill) => s.name);
  }

  private buildEvidence(
    matched: string[],
    missing: string[],
    prefix?: string
  ): string[] {
    const evidence: string[] = [];
    if (matched.length > 0) {
      evidence.push(`${prefix || 'Matched'}: ${matched.slice(0, 3).join(', ')}`);
    }
    if (missing.length > 0) {
      evidence.push(`${prefix || 'Missing'}: ${missing.slice(0, 3).join(', ')}`);
    }
    return evidence;
  }

  // ============================================================
  // END OF PART 4
  // ============================================================
}