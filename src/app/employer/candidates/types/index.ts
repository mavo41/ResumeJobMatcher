// app/employer/candidates/types/index.ts
import { Id } from "../../../../../convex/_generated/dataModel";

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
  resumeFileId?: Id<"_storage">;
  analysisStatus?: "pending" | "processing" | "completed" | "failed"
  analysisSummary?: {
  risk: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  recommendation: string;
  topStrengths: string[];
  topWeaknesses: string[];
};
}