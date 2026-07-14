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
import { CheckCircle2, AlertCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import AtsScoreCard from "../../components/AtsScoreCard";

type FeedbackTip = {
  type: "good" | "improve" | "warning";
  tip: string;
  explanation?: string;
};

type FeedbackCategory = {
  score: number;
  tips: FeedbackTip[];
};

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

  const resumeData = useQuery(
    api.resumes.getResume,
    id ? { id: id as Id<"resumes"> } : "skip"
  );
  
  const updateResumeFeedback = useMutation(api.resumes.updateResumeFeedback);

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

  // Handle not signed in
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your resume analysis results.</p>
          <SignInButton mode="modal">
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
              Sign In
            </button>
          </SignInButton>
        </div>
      </main>
    );
  }

  if (resumeData === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading resume data...</p>
        </div>
      </div>
    );
  }

  if (resumeData === null) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <Navbar />
        <div className="max-w-4xl mx-auto mt-12 bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Resume Not Found</h2>
          <p className="text-gray-500 mb-6">The resume you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => router.push("/upload")}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Go to Upload
          </button>
        </div>
      </main>
    );
  }

  // Check if feedback exists
  const hasFeedback = resumeData.feedback && Object.keys(resumeData.feedback).length > 0;

  // No feedback state
  if (!hasFeedback) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <Navbar />
        <div className="max-w-4xl mx-auto mt-12 bg-white p-8 rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">⏳ No Feedback Yet</h2>
            <p className="text-gray-500 mb-6">
              Your resume <strong>{resumeData.companyName || "Unknown"}</strong> - <strong>{resumeData.jobTitle || "Unknown"}</strong> hasn't been analyzed yet.
            </p>
            
            {/* Debug info (remove in production) */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
              <div className="mb-4 p-2 bg-gray-100 rounded text-left text-xs">
                <p><strong>Debug Info:</strong></p>
                <p>Has Feedback: {String(debugInfo.hasFeedback)}</p>
                <p>Feedback Keys: {debugInfo.feedbackKeys?.join(', ') || 'none'}</p>
                <p>Resume ID: {id}</p>
                <p>Storage ID: {resumeData.fileStorageId}</p>
              </div>
            )}
            
            {isLoadingFile ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : fileUrl ? (
              <div className="mt-4 mb-6 border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">📄 Resume Preview</p>
                <iframe 
                  src={fileUrl} 
                  className="w-full h-64 border rounded-lg" 
                  onError={() => setFileError("Failed to load preview")}
                />
              </div>
            ) : (
              <div className="mt-4 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  {fileError || "Resume preview not available"}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleReAnalyze}
                disabled={isAnalyzing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
              </button>
              <button
                onClick={() => router.push("/upload")}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg transition"
              >
                Upload New Resume
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Normalize feedback
  const normalized = normalizeFeedback(resumeData.feedback);
  const atsScore = normalized.ATS?.score ?? 0;

  return (
    <main className="bg-gray-100 min-h-screen p-8">
      <Navbar />
      
      <div className="max-w-5xl mx-auto mt-8 space-y-12">
        <header className="text-center">
          <h1 className="text-4xl font-bold">Resume Analysis Complete!</h1>
          <p className="text-lg mt-2">
            Feedback for <strong>{resumeData.companyName}</strong> —{" "}
            <strong>{resumeData.jobTitle}</strong>
          </p>
          {isLoadingFile ? (
            <Loader2 className="w-4 h-4 animate-spin inline ml-2" />
          ) : fileUrl ? (
            <p className="text-sm text-gray-500 mt-1">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                View Resume
              </a>
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-1">No resume preview available</p>
          )}
          <button
            onClick={handleReAnalyze}
            disabled={isAnalyzing}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Re-analyze Resume
          </button>
        </header>

        {/* Overall Score Gauge */}
        <div className="flex justify-center">
          <ScoreGauge value={atsScore} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="sticky top-20 h-[600px]">
            {isLoadingFile ? (
              <div className="flex items-center justify-center h-full bg-gray-200 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="ml-2 text-gray-600">Loading resume...</span>
              </div>
            ) : fileUrl ? (
              <iframe 
                src={fileUrl} 
                className="w-full h-full border rounded-lg"
                onError={() => setFileError("Failed to load preview")}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-200 rounded-lg text-gray-500">
                {fileError || "No resume preview available"}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <AtsScoreCard score={atsScore} />

            <section className="space-y-6">
              <h2 className="text-2xl font-semibold">Detailed AI Feedback</h2>

              <Accordion type="single" collapsible>
                {Object.entries(normalized).map(([category, value]) => {
                  if (category === "overallScore") return null;
                  if (!value || typeof value === "number") return null;
                  
                  const categoryValue = value as FeedbackCategory;
                  
                  return (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger>
                        <span className="capitalize">{category}</span>
                        <ScoreBadge score={categoryValue.score} />
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {categoryValue.tips && categoryValue.tips.length > 0 ? (
                            categoryValue.tips.map((entry: FeedbackTip, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                {entry.type === "good" && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                )}
                                {entry.type === "improve" && (
                                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                )}
                                {entry.type === "warning" && (
                                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                )}
                                <span>{entry.tip}</span>
                                {entry.explanation && (
                                  <span className="text-gray-600"> — {entry.explanation}</span>
                                )}
                              </li>
                            ))
                          ) : (
                            <li className="text-gray-500">No specific feedback for this category.</li>
                          )}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}