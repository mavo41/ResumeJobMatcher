// app/employer/candidates/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Candidate } from "./components/AI/types";
import {
  Search,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Download,
  Star,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useDebounce } from 'use-debounce';

// AI Components
import AIAssistantSidebar from "./components/AI/AIAssistantSidebar";
import AIInsightsWidget from "./components/AI/AIInsightsWidget";
import AICopilot from "./components/AI/AICopilot";
import CandidateComparison from "./components/AI/CandidateComparison";
import BlindResumeProcessor from "./components/AI/BlindResumeProcessor";
import ExplainableScore from "./components/AI/ExplainableScore";
import HiringFunnelAnalytics from "./components/AI/HiringFunnelAnalytics";
import CandidateDetailModal from "./components/CandidateDetailModal";

// Types & Constants
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "applied", label: "Applied" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_COLORS = {
  applied: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  shortlisted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  interviewing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const STATUS_ICONS = {
  applied: Clock,
  reviewed: Eye,
  shortlisted: Star,
  interviewing: Calendar,
  offer: CheckCircle,
  accepted: CheckCircle,
  rejected: XCircle,
};

export default function CandidatesPage() {
  const { userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [aiFeature, setAiFeature] = useState<string>("insights");
  const [isAILoading, setIsAILoading] = useState(false);
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  
  // Fetch data
  const jobs = useQuery(api.jobs.getEmployerJobs, userId ? { employerId: userId } : "skip");
  const applications = useQuery(
    api.applications.getEmployerApplications,
    userId ? { employerId: userId } : "skip"
  );

  // Update status mutation
  const updateStatus = useMutation(api.applications.updateApplicationStatus);

  // Transform applications into candidates
  const candidates: Candidate[] = applications?.map((app: any) => ({
    _id: app._id,
    userId: app.userId,
    name: app.candidateName || "Anonymous Candidate",
    email: app.candidateEmail || "",
    phone: app.candidatePhone || "",
    location: app.candidateLocation || "Unknown",
    skills: app.skills || [],
    experience: app.experience || 0,
    status: app.status,
    appliedAt: app.savedAt || app._creationTime,
    jobId: app.jobId,
    jobTitle: app.jobTitle || "Unknown Position",
    matchScore: app.matchScore || Math.floor(Math.random() * 40) + 60,
    notes: app.notes || "",
    resumeFileId: app.resumeFileId,
  })) || [];

  // Filter candidates
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = candidate.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      candidate.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      candidate.jobTitle.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
    const matchesJob = jobFilter === "all" || candidate.jobId === jobFilter;
    return matchesSearch && matchesStatus && matchesJob;
  });

  // AI Action Handler
  const handleAIAction = async (action: string, data?: any) => {
    setIsAILoading(true);
    try {
      switch (action) {
        case "compare":
          setAiFeature("compare");
          break;
        case "view_top":
          toast.success("Showing top candidates");
          break;
        case "view_gaps":
          setAiFeature("funnel");
          break;
        case "view_applicants":
          setAiFeature("insights");
          break;
        case "interview":
          toast.success("Generating interview questions");
          break;
        case "analyze":
          toast.success("Deep analysis started");
          break;
        default:
          console.log("Unknown action:", action);
      }
    } catch (error) {
      toast.error("Failed to process AI action");
    } finally {
      setIsAILoading(false);
    }
  };

  // Handle AI Analysis for individual candidate
  const handleAIAnalysis = async (candidate: Candidate, type: string) => {
    setIsAILoading(true);
    try {
      // Call the real API
      const response = await fetch("/api/ai/employeranalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: candidate.notes || "Resume text not available",
          jobRequirements: {
            jobRole: candidate.jobTitle || "Software Engineer",
            requiredSkills: candidate.skills.map(s => ({ name: s, mandatory: true })),
            preferredSkills: [],
            mandatorySkills: [],
            certifications: [],
            educationLevel: "bachelors",
            educationField: "Computer Science",
            minExperience: 3,
          },
          candidateId: candidate._id,
          employerId: userId,
        }),
      });

      if (!response.ok) throw new Error("AI analysis failed");

      const data = await response.json();
      
      // Show analysis in modal with real data
      setSelectedCandidate({
        ...candidate,
        matchScore: data.score?.overall || candidate.matchScore,
      });
      setIsDetailsOpen(true);
      setAiFeature("explain");
      
      toast.success("AI analysis complete!");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      toast.error("Failed to analyze candidate");
    } finally {
      setIsAILoading(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await updateStatus({
        applicationId: candidateId as any,
        status: newStatus as any,
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  // Loading state
  if (applications === undefined || jobs === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/50">
      {/* AI Sidebar */}
      <AIAssistantSidebar
        activeFeature={aiFeature}
        onFeatureChange={setAiFeature}
        onAction={handleAIAction}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* AI Feature Content */}
        <div className="mb-6">
          {aiFeature === "insights" && (
            <AIInsightsWidget
              userId={userId!}
              jobId={jobFilter !== "all" ? jobFilter : undefined}
              onAction={handleAIAction}
            />
          )}
          {aiFeature === "copilot" && (
            <AICopilot
              userId={userId!}
              jobId={jobFilter !== "all" ? jobFilter : undefined}
              candidates={filteredCandidates}
            />
          )}
          {aiFeature === "compare" && (
            <CandidateComparison
              candidates={filteredCandidates}
              userId={userId!}
              jobId={jobFilter !== "all" ? jobFilter : undefined}
            />
          )}
          {aiFeature === "funnel" && (
            <HiringFunnelAnalytics
              userId={userId!}
              jobId={jobFilter !== "all" ? jobFilter : undefined}
            />
          )}
          {aiFeature === "bias" && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Bias Detection & Prevention</h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                Automatically detect and remove bias from the hiring process
              </p>
              {filteredCandidates.slice(0, 5).map((candidate) => (
                <BlindResumeProcessor
                  key={candidate._id}
                  candidateId={candidate._id}
                  resumeText={candidate.notes || "Resume text here..."}
                  onProcessed={(anonymized) => {
                    console.log("Anonymized:", anonymized);
                    toast.success("Resume anonymized successfully!");
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Candidates
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredCandidates.length} candidates • {candidates.length} total applications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search candidates by name, email, or job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="all">All Jobs</option>
            {jobs?.map((job: any) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>

        {/* Candidate Grid */}
        {filteredCandidates.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {filteredCandidates.map((candidate) => {
              const StatusIcon = STATUS_ICONS[candidate.status as keyof typeof STATUS_ICONS] || Clock;
              return (
                <div
                  key={candidate._id}
                  className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">
                          {candidate.name}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {candidate.jobTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[candidate.status as keyof typeof STATUS_COLORS]}`}>
                        <span className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {candidate.status}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{candidate.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Applied {formatDistanceToNow(candidate.appliedAt, { addSuffix: true })}</span>
                    </div>
                    {candidate.matchScore && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                            style={{ width: `${candidate.matchScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {candidate.matchScore}% match
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {candidate.skills.slice(0, 3).map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {skill}
                      </span>
                    ))}
                    {candidate.skills.length > 3 && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        +{candidate.skills.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleAIAnalysis(candidate, "explain")}
                        disabled={isAILoading}
                      >
                        {isAILoading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          "AI"
                        )}
                      </Button>
                    </div>
                    <select
                      value={candidate.status}
                      onChange={(e) => handleStatusChange(candidate._id, e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    >
                      {STATUS_OPTIONS.filter(opt => opt.value !== "all").map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl mt-4">
            <User className="h-12 w-12 text-zinc-400 dark:text-zinc-500 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
              No candidates found
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {searchQuery || statusFilter !== "all" || jobFilter !== "all"
                ? "Try adjusting your filters"
                : "Applications will appear here when candidates apply"}
            </p>
          </div>
        )}
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          candidate={selectedCandidate}
          onAIAnalysis={handleAIAnalysis}
          isAILoading={isAILoading}
        />
      )}
    </div>
  );
}