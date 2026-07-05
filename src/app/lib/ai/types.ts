// lib/ai/types.ts
export type UUID = string;
export type ISODateString = string;
export type Percentage = number; //*
export type Score = number;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type HiringDecision  =
  | "REJECT"
  | "CONSIDER"
  | "INTERVIEW"
  | "STRONG_INTERVIEW"
  | "TOP_CANDIDATE";

export type RiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type ConfidenceLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type ResumeQuality =
  | "POOR"
  | "FAIR"
  | "GOOD"
  | "EXCELLENT";

export type BiasSeverity =
  | "NONE"
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type EducationLevel =
  | "high_school"
  | "bachelors"
  | "masters"
  | "phd";

export type CandidateStatus =
  | "NEW"
  | "SHORTLISTED"
  | "INTERVIEWING"
  | "OFFERED"
  | "HIRED"
  | "REJECTED";

export type RecruiRecruiterFeedbackSentimentterFeedback =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL";

  export type SkillImportance =
  | "required"
  | "preferred"
  | "optional";

export type FeedbackType =
  | "excellent"
  | "good"
  | "average"
  | "poor";

  export type IssueSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

  export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "freelance";

  export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface CandidateContact {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  website?: string;
}
export interface Skill {
  name: string;
  canonical: string;
  category:
    | "frontend"
    | "backend"
    | "database"
    | "cloud"
    | "language"
    | "framework"
    | "tool"
    | "soft"
    | "other";
  years?: number;
  confidence?: number;
  verified?: boolean;
}
export interface Certification {
  name: string;
  issuer?: string;
  issueDate?: number;
  expiryDate?: number;
  credentialId?: string;
  url?: string;
}
export interface CandidateLanguage {
  name: string;
  proficiency:
    | "basic"
    | "intermediate"
    | "advanced"
    | "native";
}
export interface Achievement {
  title: string;
  description: string;
    year?: number;
  quantified: boolean;
  impact?: string;
}
export interface ExperienceRole {
  title: string;
  company: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  durationMonths: number;
   employmentType?: EmploymentType;
    description: string;
  responsibilities: string[];
  achievements: Achievement[];
 technologies: Skill[];
  leadership: boolean;
  managedPeople?: number;
  promoted?: boolean;
}
export interface Education {
  degree: string;
  level: EducationLevel;
  field: string;
  institution: string;
  graduationYear?: number;
  gpa?: number;
  honors?: string[];
  coursework?: string[];
  relevantSubjects?: string[];
  verified?: boolean;
}
export interface Project {
  id?: UUID;
  name: string;
  description: string;
  technologies: Skill[];
  githubUrl?: string;
  liveUrl?: string;
  startDate?: ISODateString;
  endDate?: ISODateString;
  contributors?: number;
  deployed?: boolean;
  openSource?: boolean;
  impact?: string;

}
export interface ProfessionalSummary {
 headline: string;
  summary: string;
  yearsExperience: number;
  keywords?: string[];
  primaryRole: string;
  industries: string[];
  strengths: string[];
}
export interface ParsedResume {
  id?: UUID;
  candidateId?: UUID;
  contact: CandidateContact;
  summary: ProfessionalSummary;
  skills: Skill[];
  experience: {
    years: number;
    roles: ExperienceRole[];
  };
  education: Education;
  certifications: Certification[];
  projects: Project[];
  achievements: Achievement[];
  languages: CandidateLanguage[];
  extractedText?: string;
  parsingConfidence?: number;
  resumeVersion?: string;
  uploadedAt?: ISODateString;
}
export interface JobSkill {
  name: string;
  mandatory: boolean;
  minimumYears?: number;
  weight?: number;
}
export interface JobCertification {
  name: string;
  mandatory: boolean;
}
export interface JobRequirements {
  jobId?: UUID;
  title?: string;
  jobRole: string;
  department?: string;
  seniority?:
    | "junior"
    | "mid"
    | "senior"
    | "lead"
    | "manager"
    | "director";
  requiredSkills: JobSkill[];
  preferredSkills: JobSkill[];
  mandatorySkills: JobSkill[];
  certifications: JobCertification[];
  educationLevel: EducationLevel;
  educationField: string;
  minExperience: number;
  preferredExperience?: number;
  industries?: string[];
  remote?: boolean;
  location?: string;
  salaryRange?: {
    minimum: number;
    maximum: number;
    currency: string;
  };
  keywords?: string[];
}
export interface CategoryScore {
  score: Score;
  weight: number;
  confidence: Percentage;
  matchedItems: string[];
  missingItems: string[];
  evidence: string[];
  explanation: string;
}
export interface ScoreBreakdown {
  skills: CategoryScore;
  experience: CategoryScore;
  education: CategoryScore;
  projects: CategoryScore;
  certifications: CategoryScore;
  achievements: CategoryScore;
  resumeQuality?: CategoryScore;
}
export interface RankingResult {
  candidateId: string;
  candidateName: string;
  score: CandidateScore;
  rank: number;
}
export type AIModel =
  | "gemini"
  | "openai"
  | "local";

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Recommendation {
  decision: HiringRecommendation;
  confidence: Percentage;
  reasons: string[];
  strengths: string[];
  weaknesses: string[];
  nextAction: string;
}
export interface CandidateScore {
  overall: Score;
  risk: RiskLevel;
  riskReasons: string[];
  explanation: string;
  recommendation: Recommendation;
  mandatorySkills: MandatorySkillResult;
  breakdown: ScoreBreakdown;
  explainability: ExplainabilityReport;
  confidence: ConfidenceReport;
  resumeQuality: ResumeQualityReport;
  hiringRisk: HiringRiskReport;
  biasReport: BiasReport;
  generatedAt: ISODateString;
}
export interface ScoreEvidence {
  category:
    | "skills"
    | "experience"
    | "education"
    | "projects"
    | "certifications"
    | "achievements";
  title: string;
  description: string;
  impact: number;
  confidence: Percentage;
}
export interface AIReasoning {
  title: string;
  explanation: string;
  evidence: ScoreEvidence[];
  confidence: Percentage;
}
export interface ExplainabilityReport {
  summary: string;
  reasoning: AIReasoning[];
  strongestFactors: string[];
  weakestFactors: string[];
  matchedSkills: string[];
  missingSkills: string[];
  semanticMatches: Array<{
    required: string;
    matched: string;
    similarity: number;
  }>;

}
export interface ConfidenceFactor {
  name: string;
    impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}
export interface ConfidenceReport {
  score: Percentage;
  factors: ConfidenceFactor[];
  recommendation: string;
}
export interface ResumeSectionScore {
  score: number;
  maxScore: number;
  comments: string[];
}

export interface ResumeQualityMetrics {
    structure: number;
  professionalism: number;
  formatting: Score;
  grammar: Score;
  readability: Score;
  atsCompatibility: Score;
  keywordCoverage: Score;
  completeness: Score;
  projectQuality: Score;
  experienceQuality: Score;
  educationQuality: Score;
  achievementsQuality: Score;
  contactCompleteness: Score;
  overall: Score;
}
export interface ResumeIssue {
  title: string;
  description: string;
  severity: IssueSeverity;
  recommendation: string;
}
export interface ResumeSuggestion {
  category:
    | "skills"
    | "experience"
    | "education"
    | "projects"
    | "format"
    | "grammar"
    | "ats";
  priority:
    | "LOW"
    | "MEDIUM"
    | "HIGH";
  title: string;
  description: string;
}
export interface ResumeQualityReport {
  quality: ResumeQuality;
  metrics: ResumeQualityMetrics;
  strengths: string[];
  weaknesses: string[];
  suggestions: ResumeSuggestion[];
}
export interface RiskReason {
  title: string;
 description: string;
  severity:
    | "LOW"
    | "MEDIUM"
    | "HIGH";
}
export interface HiringRiskReport {
  level: RiskLevel;
  score: Score;
  reasons: RiskReason[];
}
export interface BiasIssue {
  category:
    | "gender"
    | "age"
    | "ethnicity"
    | "location"
    | "education"
    | "name"
    | "other";
  severity: BiasSeverity;
  description: string;
  recommendation: string;
}
export interface BiasReport {
  score: Score;
  passed: boolean;
  anonymized: string;
}
export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  projects: number;
  certifications: number;
  achievements: number;
 resumeQuality: number;
}
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  skills: 35,
  experience: 25,
  education: 10,
  projects: 15,
  certifications: 5,
  achievements: 5,
  resumeQuality: 5,
};
export interface RecruiterScoringConfiguration {
  recruiterId: string;
  weights: ScoringWeights;
  semanticThreshold: number;
  mandatorySkillsEnabled: boolean;
  allowSkillSubstitution: boolean;
  allowEducationSubstitution: boolean;
  allowExperienceSubstitution: boolean;
  minimumOverallScore: number;
  minimumConfidenceScore: number;
  minimumMandatorySkillsMatched: number;
  createdAt: number;
  updatedAt: number;
}
export interface RecruiterPreferences {
  prioritizeSkills: boolean;
  prioritizeExperience: boolean;
  prioritizeProjects: boolean;
  strictMandatorySkills: boolean;
  enableSemanticMatching: boolean;
  minimumOverallScore: number;
  weights: ScoringWeights;
}
export interface LearningAdjustment {
  category: keyof ScoringWeights;
  previousWeight: number;
  newWeight: number;
  reason: string;
}
export interface RecruiterLearningProfile {
  recruiterId: string;
  totalFeedback: number;
  learnedWeights: ScoringWeights;
    preferredWeights: ScoringWeights;
      accuracy: number;
  lastUpdated: ISODateString;
}

export interface ExplainableDecision {
  category:
    | "skills"
    | "experience"
    | "education"
    | "projects"
    | "certifications"
    | "achievements";
  title: string;
  explanation: string;
  impact: number;
  positive: boolean;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}
export interface ExplainableAIReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  decisions: ExplainableDecision[];
  recruiterRecommendation:
    | "Reject"
    | "Maybe"
    | "Interview"
    | "Strong Interview"
    | "Top Candidate";
}
export interface RecruiterFeedback {
  recruiterId: string;
  candidateId: string;
  jobId: string;
  originalScore: number;
  recruiterDecision:
    | "reject"
    | "interview"
    | "hire";
  recruiterNotes?: string;
  recruiterRatings: {
    skills: number;
    experience: number;
    projects: number;
    education: number;
    certifications: number;
    achievements: number;
  };
  finalOutcome?:
      | "hired"
      | "rejected"
      | "withdrawn";
    comments?: string;
  submittedAt: number;
}
export interface FeedbackLearningSnapshot {
  recruiterId: string;
  candidateId: string;
  jobId: string;
  hired: boolean;
  interviewed: boolean;
  shortlisted: boolean;
  rejected: boolean;
  notes?: string;
  scoreAtDecision: number;
  previousWeight: number;
  newWeight: number;
  reason: string;
  totalFeedback: number;
  averageDifference: number;
  recruiterAgreement: number;
   learnedWeightAdjustments: Partial<ScoringWeights>;
}
export interface MandatorySkillResult {
    passed: boolean;
      skill: string;
    matchedSkills: string[];
    missingSkills: string[];
    score: number;
    matchPercentage: number;
    autoRejected: boolean;
    explanation: string;
}
export interface HiringRecommendation {
  recommendation:
    | "Reject"
    | "Review"
    | "Interview"
    | "Strong Interview"
    | "Hire";
  sourced: number;
  applied: number;
  interviewed: number;
  offered: number;
  hired: number;
  confidence: number;
  reasons: string[];
}
export interface ResumeAnalysisResult {
  parsedResume: ParsedResume;
  score: CandidateScore;
  quality: ResumeQualityMetrics;
  confidence: ConfidenceReport;
  bias: BiasReport;
  mandatorySkills: MandatorySkillResult;
  explainability: ExplainableAIReport;
  recommendation: HiringRecommendation;
}
export interface SkillFrequency {
  skill: string;
  count: number;
}export interface HiringFunnel {
  sourced: number;
  applied: number;
  interviewed: number;
  offered: number;
  hired: number;
}
export interface WeeklyTrend {
  week: string;
  applications: number;
  hires: number;
} 
export interface AnalyticsSnapshot {
  averageScore: number;
  interviewRate: number;
  hireRate: number;
  timeToHire: number;
  recruiterSuccessRate: number;
  interviewConversion: number;
  offerConversion: number;
 }
export interface VectorDocument {
  id: string;
  embedding?: number[];
  similarity?: number;
  metadata: {
    candidateId: string;
    name: string;
    skills: string[];
    experience: number;
  };
}
export interface ScoringAuditLog {
  id: string;
  candidateId: string;
  recruiterId?: string;
  jobId: string;
  timestamp: number;
  modelVersion: string;
  semanticMatching: boolean;
  weights: ScoringWeights;
  finalScore: number;
  confidence: number;
}
export interface AIModelInformation {
  version: string;
  embeddingModel: string;
  semanticThreshold: number;
  createdAt: number;
}
export interface ResumeEmbedding {
  candidateId: UUID;
  embedding: number[];
  updatedAt: ISODateString;
  modelVersion: string;
  dimensions: number;
}
export interface EmbeddingCache {
  key: string;
 embedding: number[];
  metadata: ResumeEmbedding;
}
export interface EmbeddingVector {
  id: string;
  text: string;
  embedding: number[];
}
export interface SearchResult {
  candidateId: UUID;
  candidateName: string;
  overallScore: Score;
  similarity: Percentage;
  confidence: Percentage;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: HiringRecommendation;
  experienceYears: number;
  currentRole?: string;
  education?: string;
  location?: string;
  metadata: {
    resumeId?: UUID;
    indexedAt: ISODateString;
    semanticScore: Percentage;
    vectorDistance?: number;
  };
}
export interface SemanticSearchResponse {
  query: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  totalResults: number;
  candidates: SearchResult[];
}
export interface RecruiterDashboardSummary {
  totalCandidates: number;
  averageScore: number;
  shortlisted: number;
  interviews: number;
  hires: number;
  rejected: number;
  averageConfidence: number;
  averageResumeQuality: number;
}
export interface ParsingWarning {
  field: string;
  message: string;
}
export interface ResumeParseResult {
  resume: ParsedResume;
  confidence: number;
  warnings: ParsingWarning[];
}
export interface AIHealthStatus {
  embeddingsEnabled: boolean;
  semanticMatchingEnabled: boolean;
  feedbackLearningEnabled: boolean;
  cacheHealthy: boolean;
  lastUpdated: number;
}
