// src/app/results/[id]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { useEffect, useState, use } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Navbar from "../../components/Navbar";
import { useUser, SignInButton } from "@clerk/nextjs";
import { normalizeFeedback } from "../../types/feedback";
import { ScoreGauge } from "../../components/ScoreGauge";
import { ScoreBadge } from "../../components/ScoreBadge";
import { toast } from "react-hot-toast";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../../components/ui/accordion";
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  FileText,
  Sparkles,
  Award,
  BarChart3,
  Zap,
  ArrowUpRight,
  Clock,
  Users,
  Target,
  FileCheck
} from "lucide-react";
import AtsScoreCard from "../../components/AtsScoreCard";
import JobMatchExplanation from "@/app/components/JobMatchExplanation";

type FeedbackTip = {
  type: "good" | "improve" | "warning";
  tip: string;
  explanation?: string;
};

type FeedbackCategory = {
  score: number;
  tips: FeedbackTip[];
};

interface Suggestion {
  section: "summary" | "experience" | "skills" | "projects";
  current: string;
  suggested: string;
  reasoning: string;
  basedOn: string;
  estimatedPointImpact: number;
}

interface GenuineGap {
  requirement: string;
  note: string;
}

interface TailorResult {
  suggestions: Suggestion[];
  genuineGaps: GenuineGap[];
}

export default function ResultsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
    const [tailoring, setTailoring] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());
    const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
  

  const resumeData = useQuery(
    api.resumes.getResume,
    id ? { id: id as Id<"resumes"> } : "skip"
  );
  
  const updateResumeFeedback = useMutation(api.resumes.updateResumeFeedback);
  const tailorResume = useAction(api.resumeTailoring.tailorResumeForJob);
  
  const applyTailoredChanges = useMutation(api.resumes.applyTailoredChanges);
  const isLocked = useQuery(
    api.applications.isResumeLockedBySubmission,
    resumeData?.fileStorageId ? { fileStorageId: resumeData.fileStorageId } : "skip"
  );

    //  Derived values (safe even before resumeData resolves) ──
    const totalPointsGained = tailorResult
      ? Array.from(acceptedIndices).reduce(
          (sum, idx) => sum + (tailorResult.suggestions[idx]?.estimatedPointImpact || 0),
          0
        )
      : 0;
  
  
  // Log resume data for debugging
  useEffect(() => {
    if (resumeData) {
      console.log("[Results Page] Resume data loaded:", {
        id: resumeData._id,
        hasFeedback: !!resumeData.feedback,
        feedbackKeys: resumeData.feedback ? Object.keys(resumeData.feedback) : [],
        companyName: resumeData.companyName,
        jobTitle: resumeData.jobTitle,
      });
      setDebugInfo({
        hasFeedback: !!resumeData.feedback,
        feedbackKeys: resumeData.feedback ? Object.keys(resumeData.feedback) : [],
        feedback: resumeData.feedback,
      });
    }
  }, [resumeData]);

  // Fetch file URL using the API route
  useEffect(() => {
    const fetchFileUrl = async () => {
      if (resumeData?.fileStorageId) {
        setIsLoadingFile(true);
        setFileError(null);
        try {
          const url = `/api/storage/${resumeData.fileStorageId}`;
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            setFileUrl(url);
          } else {
            setFileError(`File not accessible (${response.status})`);
            setFileUrl(null);
          }
        } catch (error) {
          console.error("Failed to fetch file URL:", error);
          setFileError("Failed to load resume preview");
          setFileUrl(null);
        } finally {
          setIsLoadingFile(false);
        }
      } else {
        setIsLoadingFile(false);
      }
    };
    fetchFileUrl();
  }, [resumeData?.fileStorageId]);

  const handleReAnalyze = async () => {
  if (!resumeData?.fileStorageId || !id) return;
  
  setIsAnalyzing(true);
  try {
    console.log("[Results Page] Re-analyzing resume:", id);
    
    const analyzeResponse = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileStorageId: resumeData.fileStorageId,
        jobTitle: resumeData.jobTitle || "",
        jobDescription: resumeData.jobDescription || "",
        resumeId: id,
      }),
    });

    const responseData = await analyzeResponse.json();
    console.log("[Results Page] Analyze response:", responseData);

    if (!analyzeResponse.ok) {
      throw new Error(responseData.error || "Analysis failed");
    }
    
    if (responseData.feedback) {
      console.log("[Results Page] Feedback received:", responseData.feedback);
      
      // Update the resume using the Convex mutation directly
      try {
        await updateResumeFeedback({ 
          id: id as Id<"resumes">, 
          feedback: responseData.feedback 
        });
        console.log("[Results Page] Resume updated successfully");
        toast.success("Resume analyzed successfully!");
        router.refresh();
      } catch (mutationError) {
        console.error("[Results Page] Mutation error:", mutationError);
        toast.error("Analysis completed but failed to save results. Please try again.");
      }
    } else {
      console.warn("[Results Page] No feedback in response:", responseData);
      toast.error("Analysis completed but no feedback was generated.");
    }
  } catch (error) {
    console.error("[Results Page] Re-analysis error:", error);
    toast.error(error instanceof Error ? error.message : "Failed to analyze resume");
  } finally {
    setIsAnalyzing(false);
  }
};

const handleTailor = async () => {
    if (!resumeData) return;
    setTailoring(true);
    try {
      const result = await tailorResume({
        resumeId: id as Id<"resumes">,
        jobTitle: resumeData.jobTitle,
        jobDescription: resumeData.jobDescription,
      });
      setTailorResult(result);
      setAcceptedIndices(new Set());
      setRejectedIndices(new Set());
    } catch (e: any) {
      toast.error(e.message || "Failed to generate tailoring suggestions");
    } finally {
      setTailoring(false);
    }
  };

  const handleAccept = (index: number, points: number) => {
    setAcceptedIndices((prev) => new Set(prev).add(index));
    setRejectedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    toast.success(`+${points} optimization points added!`);
  };

  const handleRejectSuggestion = (index: number) => {
    setRejectedIndices((prev) => new Set(prev).add(index));
    setAcceptedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleSubmitUpdatedCv = async () => {
    if (!tailorResult) return;
    if (isLocked) {
      toast.error("This resume is attached to a submitted application and can't be modified.");
      return;
    }
    setSubmitting(true);
    try {
      const finalAcceptedSuggestions = tailorResult.suggestions.filter((_, idx) => acceptedIndices.has(idx));
      await applyTailoredChanges({
        resumeId: id as Id<"resumes">,
        acceptedSuggestions: finalAcceptedSuggestions,
        totalPointsGained,
      });
      toast.success(`CV updated (+${totalPointsGained} points)! Re-analyzing...`);
      await handleReAnalyze();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit updated resume data.");
    } finally {
      setSubmitting(false);
    }
  };


  // Handle not signed in
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="bg-white border border-slate-200 p-10 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Sign In Required</h2>
          <p className="text-slate-500 mb-8 text-sm">Please sign in to view your resume analysis results.</p>
          <SignInButton mode="modal">
            <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300">
              Sign In
            </button>
          </SignInButton>
        </div>
      </main>
    );
  }

  if (resumeData === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading resume data...</p>
        </div>
      </div>
    );
  }

  if (resumeData === null) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-20">
          <div className="bg-white border border-red-200 rounded-2xl p-12 text-center shadow-lg">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Resume Not Found</h2>
            <p className="text-slate-500 mb-8 text-sm">The resume you're looking for doesn't exist or you don't have permission to view it.</p>
            <button
              onClick={() => router.push("/upload")}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
            >
              Upload New Resume
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Check if feedback exists
  const hasFeedback = resumeData.feedback && Object.keys(resumeData.feedback).length > 0;

  // No feedback state
  if (!hasFeedback) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-20">
          <div className="bg-white border border-amber-200 rounded-2xl p-10 shadow-lg">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Analysis Pending</h2>
              <p className="text-slate-500 mb-2 text-sm">
                Your resume for <span className="text-slate-900 font-medium">{resumeData.companyName || "Unknown"}</span> — 
                <span className="text-slate-900 font-medium ml-1">{resumeData.jobTitle || "Unknown"}</span> is ready for analysis.
              </p>
              <p className="text-slate-400 text-xs mb-8">Click the button below to generate your insights</p>
              
              {/* Debug info (remove in production) */}
              {process.env.NODE_ENV === 'development' && debugInfo && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl text-left text-xs text-slate-500 font-mono">
                  <p className="text-slate-700 mb-1 font-sans"><strong>Debug Info:</strong></p>
                  <p>Has Feedback: {String(debugInfo.hasFeedback)}</p>
                  <p>Feedback Keys: {debugInfo.feedbackKeys?.join(', ') || 'none'}</p>
                  <p>Resume ID: {id}</p>
                  <p>Storage ID: {resumeData.fileStorageId}</p>
                </div>
              )}
              
              {isLoadingFile ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : fileUrl ? (
                <div className="mt-4 mb-8 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Resume Preview
                  </p>
                  <iframe 
                    src={fileUrl} 
                    className="w-full h-64 rounded-lg" 
                    onError={() => setFileError("Failed to load preview")}
                  />
                </div>
              ) : (
                <div className="mt-4 mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-700">
                    {fileError || "Resume preview not available"}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleReAnalyze}
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3.5 rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
                </button>
                <button
                  onClick={() => router.push("/upload")}
                  className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-8 py-3.5 rounded-xl font-medium transition-all duration-300"
                >
                  Upload New Resume
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Normalize feedback
  const normalized = normalizeFeedback(resumeData.feedback);
  const atsScore = normalized.ATS?.score ?? 0;
  const resumeQualityScore = normalized.overallScore ?? atsScore;
  const jobMatchScore = resumeData.jobMatchScore;
  const categoryEntries = Object.entries(normalized).filter(
    ([key, value]) => key !== "overallScore" && value && typeof value !== "number"
  ) as [string, FeedbackCategory][];

  

  // // 5. Conditions
  // const isSubmissionGated = application?.submitted === true;

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Header with metrics bar */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 text-xs font-medium">Analysis Complete</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-600 text-xs">{resumeData.companyName || "Unknown"}</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {resumeData.jobTitle || "Resume Analysis"}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Comprehensive AI-powered feedback for your application
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReAnalyze}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
              </button>
              {fileUrl && (
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border border-emerald-200"
                >
                  <FileText className="w-4 h-4" />
                  View Resume
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Overall Score</p>
                <p className="text-xl font-bold text-slate-900">{atsScore}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Categories</p>
                <p className="text-xl font-bold text-slate-900">{categoryEntries.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Improvements</p>
                <p className="text-xl font-bold text-slate-900">
                  {categoryEntries.reduce((acc, [, val]) => 
                    acc + val.tips.filter(t => t.type === "improve" || t.type === "warning").length, 0
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <FileCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Strengths</p>
                <p className="text-xl font-bold text-slate-900">
                  {categoryEntries.reduce((acc, [, val]) => 
                    acc + val.tips.filter(t => t.type === "good").length, 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
         
         {/* Two-Score Gauges */}
        <div className="flex justify-center gap-16 flex-wrap">
          <div className="text-center">
            <ScoreGauge value={resumeQualityScore} />
            <p className="mt-2 font-semibold text-zinc-700">Resume Quality</p>
            <p className="text-xs text-zinc-500">How well-written and ATS-parseable this resume is</p>
          </div>
          {typeof jobMatchScore === "number" ? (
            <div className="text-center">
              <ScoreGauge value={jobMatchScore} />
              <p className="mt-2 font-semibold text-zinc-700">Job Match</p>
              <p className="text-xs text-zinc-500">How well this resume fits this specific job's requirements</p>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center max-w-[128px]">
              <p className="text-sm text-zinc-400">Job Match not available — this resume wasn't analyzed against a specific job posting.</p>
            </div>
          )}
        </div>
        {typeof jobMatchScore === "number" && resumeData.jobMatchBreakdown && (
          <JobMatchExplanation
            resumeQualityScore={resumeQualityScore}
            jobMatchScore={jobMatchScore}
            breakdown={resumeData.jobMatchBreakdown}
          />
        )}

        {!tailorResult && resumeData.appliedTailoringSuggestions && resumeData.appliedTailoringSuggestions.length > 0 && (
  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
    ✓ You previously applied {resumeData.appliedTailoringSuggestions.length} tailoring suggestion(s)
    (+{resumeData.tailoringPointsGained} points). Manually update your resume/resume-builder draft to reflect
    these changes, then re-upload if you'd like a fresh analysis.
  </div>
)}

      
       {/* Tailoring Section */}
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Generate Trigger */}
{isLocked && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                This resume is attached to a submitted application, so tailoring changes can't be applied to it.
                You can still view suggestions for reference, but to use them, upload a new version of your resume.
              </span>
            </div>
          )}
          {!tailorResult && !isLocked && (
                    <button 
          onClick={handleTailor} 
          disabled={tailoring}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {tailoring ? "Analyzing Experience..." : "Analyze & Tailor Resume"}
        </button>
      )}
      {!tailorResult && isLocked && (
            <button
              onClick={handleTailor}
              disabled={tailoring}
              className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {tailoring ? "Analyzing..." : "View Suggestions (Read-only)"}
            </button>
          )}

      {tailorResult && (
        <>
          {/* Header & Score Tracker */}
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold">Resume Enhancements</h2>
              <p className="text-gray-500">Align your existing experience to the job requirements transparently.</p>
            </div>
            <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-center font-semibold">
              <div className="text-xs uppercase tracking-wide opacity-70">Impact Score</div>
              <div className="text-xl">+{totalPointsGained} Points</div>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Tailoring Suggestions</h3>
            {tailorResult.suggestions.map((suggestion, index) => {
              const isAccepted = acceptedIndices.has(index);
              const isRejected = rejectedIndices.has(index);

              return (
                <div 
                  key={index} 
                  className={`border rounded-xl p-5 transition-all ${
                    isAccepted ? "border-green-300 bg-green-50/30" : 
                    isRejected ? "border-gray-200 bg-gray-50/50 opacity-60" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-100 uppercase text-gray-600">
                      {suggestion.section}
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      +{suggestion.estimatedPointImpact} impact pts
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 my-3 text-sm">
                    <div className="p-3 bg-red-50/40 border border-red-100 rounded-lg">
                      <span className="block text-xs font-bold text-red-500 mb-1">CURRENT TEXT</span>
                      <p className="text-gray-700 italic">"{suggestion.current}"</p>
                    </div>
                    <div className="p-3 bg-green-50/40 border border-green-100 rounded-lg">
                      <span className="block text-xs font-bold text-green-600 mb-1">SUGGESTED REPHRASING</span>
                      <p className="text-gray-800 font-medium">"{suggestion.suggested}"</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-600 space-y-1 border-t pt-3">
                    <p><strong>Reasoning:</strong> {suggestion.reasoning}</p>
                    <p><strong>Verified Source Context:</strong> <span className="italic text-gray-500">"{suggestion.basedOn}"</span></p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => handleRejectSuggestion(index)}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition ${
                        isRejected ? "bg-gray-200 border-gray-300 text-gray-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {isRejected ? "Rejected" : "Skip"}
                    </button>
                    <button
                      onClick={() => handleAccept(index, suggestion.estimatedPointImpact)}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition ${
                        isAccepted ? "bg-green-600 border-green-600 text-white" : "bg-white border-green-600 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {isAccepted ? "Accepted ✓" : "Accept Rephrasing"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Honest Gaps Block */}
          {tailorResult.genuineGaps.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <span className="text-lg">⚠️</span>
                <h3 className="font-bold text-sm uppercase tracking-wider">Honest Qualification Gaps</h3>
              </div>
              <p className="text-xs text-amber-700">
                The target job description requires the following skills or milestones. Your current profile does not verifiably confirm them. To preserve integrity, these elements have been safely sequestered and <strong>must not be fabricated</strong>.
              </p>
              <ul className="divide-y divide-amber-200 text-sm">
                {tailorResult.genuineGaps.map((gap, index) => (
                  <li key={index} className="py-2.5 first:pt-0 last:pb-0">
                    <span className="font-semibold block text-amber-900">{gap.requirement}</span>
                    <span className="text-xs text-amber-700/80">{gap.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {acceptedIndices.size > 0 && (
                          <button
                            onClick={handleSubmitUpdatedCv}
                            disabled={submitting || isLocked}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
                          >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
{submitting
                    ? "Submitting..."
                    : isLocked
                    ? "Locked — Resume Already Submitted"
                    : `Submit Updated CV (+${totalPointsGained} points)`}                          </button>
                        )}
                      </>
                    )}
                  </div>
          
     {/* Main Content - Split Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Resume Preview - Left Panel */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <span className="text-xs text-slate-500 ml-2">Resume Preview</span>
                  </div>
                  <span className="text-xs text-slate-400">PDF</span>
                </div>
                <div className="h-[600px] bg-slate-50">
                  {isLoadingFile ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                      <span className="text-slate-500 text-sm">Loading resume...</span>
                    </div>
                  ) : fileUrl ? (
                    <iframe 
                      src={fileUrl} 
                      className="w-full h-full"
                      onError={() => setFileError("Failed to load preview")}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <FileText className="w-12 h-12 mb-3 text-slate-300" />
                      <p className="text-sm">{fileError || "No resume preview available"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Panel - Right Panel */}
          <div className="lg:col-span-7 space-y-6">
            {/* ATS Score Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">ATS Compatibility</h3>
                  <p className="text-2xl font-bold text-slate-900">{atsScore}%</p>
                  <p className="text-xs text-slate-400 mt-1">Based on keyword matching and formatting</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 text-xs font-medium">
                    {atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                  style={{ width: `${atsScore}%` }}
                />
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">AI Feedback Analysis</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Detailed breakdown by category</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-500">Strength</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-slate-500">Improve</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    <span className="text-xs text-slate-500">Warning</span>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="space-y-3">
                {categoryEntries.map(([category, categoryValue]) => {
                  const score = categoryValue.score;
                  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600';
                  
                  return (
                    <AccordionItem key={category} value={category} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all duration-200">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-900 capitalize">{category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${scoreColor}`}>{score}%</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  score >= 80 ? 'bg-emerald-500' : 
                                  score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-4 pb-4 space-y-2">
                          {categoryValue.tips && categoryValue.tips.length > 0 ? (
                            categoryValue.tips.map((entry: FeedbackTip, idx: number) => {
                              let icon;
                              let bgColor;
                              let borderColor;
                              let textColor;
                              
                              if (entry.type === "good") {
                                icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />;
                                bgColor = "bg-emerald-50";
                                borderColor = "border-emerald-200";
                                textColor = "text-slate-700";
                              } else if (entry.type === "improve") {
                                icon = <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />;
                                bgColor = "bg-amber-50";
                                borderColor = "border-amber-200";
                                textColor = "text-slate-700";
                              } else {
                                icon = <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />;
                                bgColor = "bg-rose-50";
                                borderColor = "border-rose-200";
                                textColor = "text-slate-700";
                              }
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={`flex items-start gap-3 p-3 rounded-lg ${bgColor} border ${borderColor}`}
                                >
                                  {icon}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${textColor} leading-relaxed`}>
                                      {entry.tip}
                                    </p>
                                    {entry.explanation && (
                                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        {entry.explanation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm text-slate-500 p-3 text-center">
                              No specific feedback for this category.
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>  
          </div>
        </div>
      </div>
    </main>
  );
}