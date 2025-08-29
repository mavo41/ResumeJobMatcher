"use client";
//src\app\profile\page.tsx
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Navbar from "../components/Navbar";
import { useUser, SignInButton } from "@clerk/nextjs";
import { normalizeFeedback } from "../types/feedback";
import { ScoreGauge } from "../components/ScoreGauge";
import { ScoreBadge } from "../components/ScoreBadge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../components/ui/accordion";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import AtsScoreCard from "../components/AtsScoreCard";
import { useConvexFileUrl } from "../lib/useConvexFileUrl";

// Types
type FeedbackTip = {
  type: "good" | "improve" | "warning";
  tip: string;
  explanation?: string;
};

type FeedbackCategory = {
  score: number;
  tips: FeedbackTip[];
};

type NormalizedFeedback = {
  overallScore?: number;
  ATS: FeedbackCategory;
  toneAndStyle?: FeedbackCategory;
  content?: FeedbackCategory;
  structure?: FeedbackCategory;
  skills?: FeedbackCategory;
  [key: string]: number | FeedbackCategory | undefined;
};

export default function ResultsPage({ params }: { params: { id: string } }) {
  const { isSignedIn, isLoaded } = useUser();
  const resumeData = useQuery(
    api.resumes.getResume,
    params.id ? { id: params.id as Id<"resumes"> } : "skip"
  );
  const getFileUrl = useAction(api.resumes.getFileUrl);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const resumes = useQuery(api.resumes.getMyResumes);

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-screen">Loading auth…</div>;
  }
  if (!isSignedIn) {
    return (
      <main className="p-8">
        <p>You must be signed in to view this page.</p>
        <SignInButton mode="modal" />
      </main>
    );
  }

  useEffect(() => {
    (async () => {
      if (resumeData?.fileStorageId) {
        const url = await getFileUrl({ storageId: resumeData.fileStorageId });
        setFileUrl(url ?? null);
      }
    })();
  }, [resumeData?.fileStorageId, getFileUrl]);

  if (resumeData === undefined) return <div>Loading resume...</div>;
  if (resumeData === null || !resumeData.feedback) return <div>No feedback found.</div>;

  const normalized = normalizeFeedback(resumeData.feedback);
  const atsScore = normalized.ATS.score ?? 0;

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
        </header>

        {/* Overall Score Gauge */}
        <div className="flex justify-center">
          <ScoreGauge value={atsScore} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Resume Preview */}
          <div className="sticky top-20 h-[600px]">
            {fileUrl ? (
              <iframe src={fileUrl} className="w-full h-full border rounded-lg" />
            ) : (
              <p>No resume uploaded.</p>
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

                  // Narrow to FeedbackCategory
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
                          {categoryValue.tips.map((entry: FeedbackTip, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              {entry.type === "good" && (
                                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                              )}
                              {entry.type === "improve" && (
                                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                              )}
                              {entry.type === "warning" && (
                                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                              )}
                              <span>{entry.tip}</span>
                              {entry.explanation && (
                                <span className="text-gray-600"> — {entry.explanation}</span>
                              )}
                            </li>
                          ))}
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
