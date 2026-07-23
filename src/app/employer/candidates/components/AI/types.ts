// app/employer/candidates/components/AI/types.ts

export interface Candidate {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  skills: string[];
  experience: number;
  status: "applied" | "reviewed" | "shortlisted" | "interviewing" | "offer" | "rejected" | "accepted";
  appliedAt: number;
  jobId: string;
  jobTitle: string;
  matchScore?: number;
  notes?: string;
  resumeFileId?: any;
  anonymizedResume?: string;
  analysisStatus?: "pending" | "processing" | "completed" | "failed"
  analysisSummary?: {
  risk: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  recommendation: string;
  topStrengths: string[];
  topWeaknesses: string[];
};
}

export interface ExplainableScore {
  overall: number;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  riskReason: string;
  recommendation: string;
  categories: {
    skills: { score: number; weight: number; reasoning: string };
    experience: { score: number; weight: number; reasoning: string };
    projects: { score: number; weight: number; reasoning: string };
    education: { score: number; weight: number; reasoning: string };
    certifications: { score: number; weight: number; reasoning: string };
    softSkills: { score: number; weight: number; reasoning: string };
  };
}

export interface ComparisonResult {
  rankings: Array<{
    candidateId: string;
    name: string;
    score: number;
    color: string;
    recommendation: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  insights: {
    topSkill: string;
    missingSkill: string;
    averageScore: number;
    totalCandidates: number;
  };
}

export interface HiringInsight {
  totalApplicants: number;
  topMatch: number;
  interviewReady: number;
  missingSkills: Array<{ skill: string; percentage: number }>;
  recommendation: string;
  topCandidates: Array<{ name: string; matchScore: number; reason: string }>;
  timeToHire?: number;
  applicationTrends?: Array<{ date: string; count: number }>;
}