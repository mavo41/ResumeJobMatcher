// src/app/profile/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Navbar from "../components/Navbar";
import { useUser, SignInButton } from "@clerk/nextjs";
import { normalizeFeedback, defaultFeedback } from "../types/feedback";
import { ScoreGauge } from "../components/ScoreGauge";
import { ScoreBadge } from "../components/ScoreBadge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../components/ui/accordion";
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import AtsScoreCard from "../components/AtsScoreCard";

type FeedbackTip = {
  type: "good" | "improve" | "warning";
  tip: string;
  explanation?: string;
};

type FeedbackCategory = {
  score: number;
  tips: FeedbackTip[];
};

export default function ResultsPage({ params }: { params: { id: string } }) {
  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(true);

  const resumeData = useQuery(
    api.resumes.getResume,
    params.id ? { id: params.id as Id<"resumes"> } : "skip"
  );
  
  const getFileUrl = useAction(api.resumes.getFileUrl);
  const resumes = useQuery(api.resumes.getMyResumes);

  // ✅ useEffect for fetching file URL - called unconditionally
  useEffect(() => {
    const fetchFileUrl = async () => {
      if (resumeData?.fileStorageId) {
        setIsLoadingFile(true);
        try {
          const url = await getFileUrl({ storageId: resumeData.fileStorageId });
          setFileUrl(url ?? null);
        } catch (error) {
          console.error("Failed to fetch file URL:", error);
          setFileUrl(null);
        } finally {
          setIsLoadingFile(false);
        }
      } else {
        setIsLoadingFile(false);
      }
    };
    fetchFileUrl();
  }, [resumeData?.fileStorageId, getFileUrl]);

  // ✅ Loading state - use a loading component instead of early return
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ✅ Authentication check - now after all hooks
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

  // ✅ Loading resume data
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

  // ✅ Resume not found or no feedback
  if (resumeData === null || !resumeData.feedback) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <Navbar />
        <div className="max-w-4xl mx-auto mt-12 bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Feedback Found</h2>
          <p className="text-gray-500 mb-6">This resume doesn't have feedback yet. Please analyze your resume first.</p>
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

  // ✅ Normalize feedback
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
          {fileUrl && (
            <p className="text-sm text-gray-500 mt-1">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                View Resume
              </a>
            </p>
          )}
        </header>

        {/* Overall Score Gauge */}
        <div className="flex justify-center">
          <ScoreGauge value={atsScore} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Resume Preview */}
          <div className="sticky top-20 h-[600px]">
            {isLoadingFile ? (
              <div className="flex items-center justify-center h-full bg-gray-200 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="ml-2 text-gray-600">Loading resume...</span>
              </div>
            ) : fileUrl ? (
              <iframe src={fileUrl} className="w-full h-full border rounded-lg" />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-200 rounded-lg text-gray-500">
                No resume preview available
              </div>
            )}
          </div>

          {/* Feedback Section */}
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