"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  X, User, Mail, Phone, MapPin, Calendar, Star, Brain, Sparkles, Loader2,
  Download, MessageSquare, CheckCircle, XCircle, Clock, Eye, Shield, Target, Copy, Check
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import { Button } from "../../../components/ui/button";
import { Candidate } from "./AI/types";


interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
}

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  shortlisted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  interviewing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};
const STATUS_ICONS: Record<string, any> = {
  applied: Clock, reviewed: Eye, shortlisted: Star, interviewing: Calendar,
  offer: CheckCircle, accepted: CheckCircle, rejected: XCircle,
};

type Panel = "explain" | "match" | "bias" | "questions" | null;

export default function CandidateDetailModal({ isOpen, onClose, candidate }: CandidateDetailModalProps) {
  const { userId: employerId } = useAuth();
  const router = useRouter();

  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [biasResult, setBiasResult] = useState<any>(null);
  const [questionsResult, setQuestionsResult] = useState<any[] | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copiedQuestions, setCopiedQuestions] = useState(false);

  const job = useQuery(
    api.jobs.getJobById,
    candidate.jobId ? { jobId: candidate.jobId as Id<"jobs"> } : "skip"
  );
  const getFileUrl = useAction(api.resumes.getFileUrl);
  const getResumeText = useAction(api.applicationResume.getResumeTextForApplication);
  const processResumeBlind = useMutation(api.ai.processResumeBlind);
  const getOrCreateConversation = useMutation(api.messages.getOrCreateConversation);
  const rerunAnalysis = useMutation(api.applications.rerunAnalysis);

  if (!isOpen) return null;
  const StatusIcon = STATUS_ICONS[candidate.status] || Clock;

  const togglePanel = async (panel: Exclude<Panel, null>) => {
    if (activePanel === panel) {
      setActivePanel(null);
      return;
    }
    setActivePanel(panel);

    if (panel === "explain") return; // already have analysisSummary locally, no call needed

    if (panel === "match" && !matchResult) {
      setLoading(true);
      try {
        const resumeText = await getResumeText({ applicationId: candidate._id as Id<"applications"> });
        const res = await fetch("/api/ai/employeranalyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText,
            jobRequirements: {
              jobRole: candidate.jobTitle || job?.title || "Software Engineer",
              requiredSkills: (job?.requirements || []).map((r: string) => ({ name: r, mandatory: true })),
              preferredSkills: [],
              mandatorySkills: [],
              certifications: [],
              educationLevel: "bachelors",
              educationField: "Not specified",
              minExperience: 0,
            },
            candidateId: candidate._id,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to compute match breakdown");
        setMatchResult(await res.json());
      } catch (e: any) {
        toast.error(e.message || "Failed to load match breakdown");
        setActivePanel(null);
      } finally {
        setLoading(false);
      }
    }

    if (panel === "bias" && !biasResult) {
      setLoading(true);
      try {
        const resumeText = await getResumeText({ applicationId: candidate._id as Id<"applications"> });
        if (!employerId) throw new Error("Not authenticated");
        const result = await processResumeBlind({
          resumeText,
          candidateId: candidate._id,
          employerId,
        });
        setBiasResult(result);
      } catch (e: any) {
        toast.error(e.message || "Failed to run bias analysis");
        setActivePanel(null);
      } finally {
        setLoading(false);
      }
    }

    if (panel === "questions" && !questionsResult) {
      setLoading(true);
      try {
        const resumeText = await getResumeText({ applicationId: candidate._id as Id<"applications"> });
        const res = await fetch("/api/ai/interview-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText,
            jobTitle: candidate.jobTitle || job?.title,
            jobDescription: job?.description,
          }),
        });
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(`Server returned a non-JSON response (status ${res.status}) — check that the API route file exists.`);
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to generate questions");
        }
        const data = await res.json();
        setQuestionsResult(data.questions);
      } catch (e: any) {
        toast.error(e.message || "Failed to generate interview questions");
        setActivePanel(null);
      } finally {
        setLoading(false);
      }
    }
  };


  const handleCopyQuestions = async () => {
    if (!questionsResult) return;
    const text = questionsResult
      .map((q, i) => `${i + 1}. ${q.question}${q.purpose ? `\n   (${q.purpose})` : ""}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedQuestions(true);
      toast.success("Questions copied to clipboard!", { duration: 3000 });
     setTimeout(() => setCopiedQuestions(false), 2000);
    } catch {
      toast.error("Failed to copy questions");
    }
  };

  
  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await rerunAnalysis({ applicationId: candidate._id as Id<"applications"> });
      toast.success("Re-analysis started — this candidate's data will update shortly.");
    } catch (e: any) {
      toast.error(e.message || "Failed to re-analyze");
    } finally {
      setReanalyzing(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!candidate.resumeFileId) {
      toast.error("No resume file on record for this candidate.");
      return;
    }
    try {
      const url = await getFileUrl({ storageId: candidate.resumeFileId });
      if (url) window.open(url, "_blank");
      else toast.error("Could not retrieve resume file.");
    } catch {
      toast.error("Failed to load resume.");
    }
  };

  const handleMessage = async () => {
    if (!employerId || !candidate.jobId) return;
    const conversationId = await getOrCreateConversation({
      employerId,
      candidateUserId: candidate.userId,
      applicationId: candidate._id as Id<"applications">,
      jobId: candidate.jobId as Id<"jobs">,
    });
    router.push(`/employer/messages?conversationId=${conversationId}`);
  };

  const handleScheduleInterview = async () => {
    if (!employerId || !candidate.jobId) return;
    const conversationId = await getOrCreateConversation({
      employerId,
      candidateUserId: candidate.userId,
      applicationId: candidate._id as Id<"applications">,
      jobId: candidate.jobId as Id<"jobs">,
    });
    router.push(`/employer/messages?conversationId=${conversationId}&openSchedule=1`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4 animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold text-white">
              {candidate.name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{candidate.name || "Unknown Candidate"}</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{candidate.jobTitle || "No position"}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[candidate.status] || "bg-zinc-100 text-zinc-700"}`}>
                  <span className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {candidate.status ? candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1) : "Unknown"}
                  </span>
                  </span>
                   <Button size="sm" variant="ghost" onClick={handleReanalyze} disabled={reanalyzing}>
                  {reanalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                   Re-analyze
                  </Button>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Mail className="w-4 h-4 text-zinc-400" /><span>{candidate.email || "No email"}</span>
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Phone className="w-4 h-4 text-zinc-400" /><span>{candidate.phone}</span>
              </div>
            )}
            {candidate.location && (
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <MapPin className="w-4 h-4 text-zinc-400" /><span>{candidate.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>Applied {candidate.appliedAt ? formatDistanceToNow(candidate.appliedAt, { addSuffix: true }) : "Unknown"}</span>
            </div>
          </div>

          {typeof candidate.matchScore === "number" && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Match Score</span>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">{candidate.matchScore}%</span>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600" style={{ width: `${candidate.matchScore}%` }} />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills && candidate.skills.length > 0 ? (
                candidate.skills.map((skill, i) => (
                  <span key={i} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">No skills detected</span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Experience</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {candidate.experience || 0} years of professional experience
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" /> AI Features
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button size="sm" variant={activePanel === "explain" ? "default" : "outline"} className="text-xs" onClick={() => togglePanel("explain")}>
                <Brain className="w-3.5 h-3.5 mr-1.5" /> Explain
              </Button>
              <Button size="sm" variant={activePanel === "questions" ? "default" : "outline"} className="text-xs" onClick={() => togglePanel("questions")}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Questions
              </Button>
              <Button size="sm" variant={activePanel === "bias" ? "default" : "outline"} className="text-xs" onClick={() => togglePanel("bias")}>
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Bias
              </Button>
              <Button size="sm" variant={activePanel === "match" ? "default" : "outline"} className="text-xs" onClick={() => togglePanel("match")}>
                <Target className="w-3.5 h-3.5 mr-1.5" /> Match
              </Button>
            </div>

            {loading && (
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                <span className="text-sm text-indigo-700 dark:text-indigo-400">AI is analyzing...</span>
              </div>
            )}

            {!loading && activePanel === "explain" && (
              candidate.analysisSummary ? (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-2 text-sm">
                  <p><strong>Risk:</strong> {candidate.analysisSummary.risk} ({candidate.analysisSummary.confidence}% confidence)</p>
                  <p><strong>Recommendation:</strong> {candidate.analysisSummary.recommendation}</p>
                  {candidate.analysisSummary.topStrengths.length > 0 && (
                    <p><strong>Strengths:</strong> {candidate.analysisSummary.topStrengths.join(", ")}</p>
                  )}
                  {candidate.analysisSummary.topWeaknesses.length > 0 && (
                    <p><strong>Areas for review:</strong> {candidate.analysisSummary.topWeaknesses.join(", ")}</p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">This candidate hasn't been analyzed yet.</p>
              )
            )}

            {!loading && activePanel === "questions" && questionsResult && (
              <div className="mt-4 space-y-3">
                 <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="text-xs" onClick={handleCopyQuestions}>
                    {copiedQuestions ? (
                      <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</>
                    ) : (
                     <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy All</>
                    )}
                  </Button>
                </div>
                {questionsResult.map((q, i) => (
                  <div key={i} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{i + 1}. {q.question}</p>
                    {q.purpose && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{q.purpose}</p>}
                  </div>
                ))}
              </div>
            )}

            {!loading && activePanel === "bias" && biasResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Bias Score</span>
                  <span className={biasResult.biasScore < 20 ? "text-emerald-600" : biasResult.biasScore < 50 ? "text-amber-600" : "text-rose-600"}>
                    {biasResult.biasScore}% detected
                  </span>
                </div>
                {biasResult.biasIssues?.map((issue: any, i: number) => (
                  <div key={i} className="text-sm p-2 rounded bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="font-medium">{issue.type}</span> — {issue.suggestion}{" "}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700">{issue.severity}</span>
                  </div>
                ))}
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 max-h-48 overflow-y-auto text-xs font-mono whitespace-pre-wrap">
                  {biasResult.anonymized}
                </div>
              </div>
            )}

            {!loading && activePanel === "match" && matchResult?.score?.breakdown && (
              <div className="mt-4 space-y-3">
                {Object.entries(matchResult.score.breakdown).map(([key, val]: [string, any]) => (
                  <div key={key} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{key}</span>
                      <span>{val.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 mb-2">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${val.score}%` }} />
                    </div>
                    {val.matchedItems?.length > 0 && (
                      <p className="text-xs text-emerald-600">Matched: {val.matchedItems.slice(0, 5).join(", ")}</p>
                    )}
                    {val.missingItems?.length > 0 && (
                      <p className="text-xs text-rose-600">Missing: {val.missingItems.slice(0, 5).join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" className="text-xs" onClick={handleMessage}>
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Message
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={handleDownloadResume} disabled={!candidate.resumeFileId}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Resume
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={handleScheduleInterview}>
                <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule Interview
              </Button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-end rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}