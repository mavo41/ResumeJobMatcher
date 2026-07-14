// src/app/results/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Navbar from "../components/Navbar";
import { useUser } from "@clerk/nextjs";
import { Loader2, FileText } from "lucide-react";
import Link from "next/link";

export default function ResultsListPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  
  const resumes = useQuery(api.resumes.getMyResumes);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <Navbar />
      <div className="max-w-4xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-6">Your Resume Results</h1>
        
        {resumes === undefined ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">No Resumes Found</h2>
            <p className="text-gray-500 mt-2">Upload a resume to get AI-powered feedback.</p>
            <button
              onClick={() => router.push("/upload")}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Upload Resume
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {resumes.map((resume: any) => (
              <Link
                key={resume._id}
                href={`/results/${resume._id}`}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{resume.companyName}</h3>
                    <p className="text-gray-600">{resume.jobTitle}</p>
                    <p className="text-sm text-gray-400">
                      {resume.feedback ? "✅ Analyzed" : "⏳ Pending Analysis"}
                    </p>
                  </div>
                  {resume.feedback && (
                    <div className="text-right">
                      <span className="text-2xl font-bold text-indigo-600">
                        {resume.feedback.overallScore || resume.feedback.ATS?.score || 0}%
                      </span>
                      <p className="text-xs text-gray-400">ATS Score</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}