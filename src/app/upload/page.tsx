// src/app/upload/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import FileUploader from "../components/FileUploader";
import { useConvexFileUploader } from "../lib/convexUpload";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { getFileFromConvexStorage } from "../lib/getFileFromConvexStorage";
import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { X, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function UploadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The resume currently being analyzed (if any). Once set, we reactively
  // watch it via useQuery below instead of blocking on the API response.
  const [pendingResumeId, setPendingResumeId] = useState<Id<"resumes"> | null>(null);
  const [pendingArgs, setPendingArgs] = useState<{
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  } | null>(null);

  const router = useRouter();

  // Hooks
  const { uploadFileToConvex } = useConvexFileUploader();
  const createResume = useMutation(api.resumes.createResume);
  const resumes = useQuery(api.resumes.getMyResumes) ?? [];
  const getFileUrl = useAction(api.resumes.getFileUrl);
  const archiveResume = useMutation(api.resumes.archiveResume);
  const deleteResume = useMutation(api.resumes.deleteResume);

  // Reactive subscription to the resume being analyzed. This is the
  // mechanism that replaces polling / waiting on the HTTP response:
  // Convex pushes the update automatically the instant the background
  // action patches the document.
  const analyzingResume = useQuery(
    api.resumes.getResume,
    pendingResumeId ? { id: pendingResumeId } : "skip"
  );

  useEffect(() => {
    if (!analyzingResume || !pendingResumeId) return;

    if (analyzingResume.analysisStatus === "completed") {
      toast.success("Resume analyzed successfully!");
      const id = pendingResumeId;
      setPendingResumeId(null);
      setPendingArgs(null);
      setIsSubmitting(false);
      router.push(`/results/${id}`);
    } else if (analyzingResume.analysisStatus === "failed") {
      setIsSubmitting(false);
      setError(analyzingResume.analysisError || "Analysis failed. Please try again.");
      toast.error("Analysis failed.");
    } else if (analyzingResume.analysisStatus === "processing") {
      setStatusText("Analyzing your resume with AI...");
    }
  }, [analyzingResume, pendingResumeId, router]);

  const handleFileSelect = (f: File | null) => {
    setFile(f);
    setError(null);
  };

  const handleResetState = () => {
    setIsSubmitting(false);
    setStatusText("");
    setFile(null);
    setCompanyName("");
    setJobTitle("");
    setJobDescription("");
    setError(null);
    setPendingResumeId(null);
    setPendingArgs(null);
  };

  const handleRetry = () => {
    setError(null);
    if (pendingArgs) {
      handleAnalyze(pendingArgs);
    }
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setError(null);
    setIsSubmitting(true);
    setPendingArgs({ companyName, jobTitle, jobDescription, file });
    setStatusText("Uploading your file...");

    try {
      if (!uploadFileToConvex) {
        throw new Error("File upload service not available");
      }

      // 1) Upload resume file
      setStatusText("Uploading file to storage...");
      const storageId = await uploadFileToConvex(file);

      // 2) Create resume record
      setStatusText("Saving resume metadata...");
      const resumeId = await createResume({
        companyName,
        jobTitle,
        jobDescription,
        fileStorageId: storageId,
      });

      // 3) Schedule background analysis. This call returns almost
      // immediately — it does NOT wait for Gemini or PDF extraction.
      setStatusText("Starting AI analysis...");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileStorageId: storageId,
          jobTitle,
          jobDescription,
          resumeId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to start analysis");
      }

      // 4) Start watching this resume reactively. The useEffect above
      // will redirect once analysisStatus becomes "completed".
      setPendingResumeId(resumeId);
      setStatusText("Analyzing your resume with AI...");
    } catch (e: any) {
      console.error("Upload/Analysis error:", e);
      setError(e.message || "Something went wrong. Please try again.");
      toast.error(e.message || "Failed to analyze resume");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload a resume file");
      return;
    }
    setError(null);
    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  const handleDownload = async (storageId: Id<"_storage">) => {
    try {
      const fileContent = await getFileFromConvexStorage(storageId);
      const url = await getFileUrl({ storageId });
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Could not get download URL");
      }
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed. Please try again.");
    }
  };

  const isLoading = isSubmitting;

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>

          {isLoading ? (
            <>
              <h2 className="text-center">{statusText}</h2>
              <div className="flex flex-col items-center mt-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-sm text-gray-500 mt-2">
                  This runs in the background — feel free to keep this tab open.
                </p>
              </div>
              <img src="/images/resume-scan.gif" className="w-full max-w-md mx-auto" alt="" />
            </>
          ) : error ? (
            <div className="max-w-2xl mx-auto mt-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-rose-700 dark:text-rose-400">Analysis Failed</h3>
                  <p className="text-sm text-rose-600 dark:text-rose-300 mt-1">{error}</p>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={handleRetry}
                      className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                    <button
                      onClick={handleResetState}
                      className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <h2 className="text-center">Drop your resume for an ATS score and improvement tips</h2>
          )}

          {!isLoading && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8 max-w-2xl mx-auto"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                  className="text-black w-full px-4 py-2 border rounded-lg"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                  className="text-black w-full px-4 py-2 border rounded-lg"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  rows={6}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                  className="text-black w-full px-4 py-2 border rounded-lg"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume (PDF)</label>
                <FileUploader onFileSelect={handleFileSelect} />
                {file && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <button
                className="primary-button bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
                type="submit"
                disabled={!file || isLoading}
              >
                {isLoading ? "Analyzing..." : "Analyze Resume"}
              </button>
            </form>
          )}

          <div className="mt-10 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Your Uploaded Resumes</h2>
            {resumes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No resumes uploaded yet</p>
            ) : (
              <ul className="space-y-2">
                {resumes.map((resume: any) => (
                  <li
                    key={resume._id}
                    className="flex justify-between items-center bg-white p-3 rounded-lg shadow"
                  >
                    <span className="font-medium">
                      {resume.companyName} - {resume.jobTitle}
                      {resume.analysisStatus === "processing" && (
                        <span className="ml-2 text-xs text-amber-600">(analyzing…)</span>
                      )}
                      {resume.analysisStatus === "failed" && (
                        <span className="ml-2 text-xs text-rose-600">(analysis failed)</span>
                      )}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(resume.fileStorageId)}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Download
                      </button>
                      <Link
                        href={`/results/${resume._id}`}
                        className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                      >
                        View Feedback
                      </Link>
                      <button
                        onClick={() => archiveResume({ resumeId: resume._id })}
                        className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => deleteResume({ resumeId: resume._id })}
                        className="text-red-600 hover:text-red-800"
                        title="Delete permanently"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}