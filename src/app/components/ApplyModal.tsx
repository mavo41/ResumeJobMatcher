// components/ApplyModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: Id<"jobs">;
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  onApplySuccess?: () => void;
}

export default function ApplyModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  jobDescription = "",
  onApplySuccess,
}: ApplyModalProps) {
  const { user } = useUser();
  const router = useRouter();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsFeedback, setAtsFeedback] = useState<any>(null);
  const [hasExistingResume, setHasExistingResume] = useState(false);
  const [useExistingResume, setUseExistingResume] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"upload" | "analyze" | "review" | "success">("upload");
  const [resumeId, setResumeId] = useState<Id<"resumes"> | null>(null);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Check if user has an existing resume
  const userResume = useQuery(
    api.resumes.getUserResume,
    user?.id ? { userId: user.id } : "skip"
  );

   // Reactively watch the resume currently being analyzed — mirrors the
  // pattern used in upload/page.tsx. No polling required.
  const analyzingResume = useQuery(
    api.resumes.getResume,
    resumeId && step === "analyze" ? { id: resumeId } : "skip"
 );

  useEffect(() => {
    if (!analyzingResume || step !== "analyze") return;

    if (analyzingResume.analysisStatus === "completed" && analyzingResume.feedback) {
      setAtsScore(analyzingResume.feedback.overallScore ?? 65);
      setAtsFeedback(analyzingResume.feedback);
      setIsAnalyzing(false);
      setIsUploading(false);
      toast.success("Resume analyzed successfully!");
    } else if (analyzingResume.analysisStatus === "failed") {
      setIsAnalyzing(false);
      setIsUploading(false);
      setError(analyzingResume.analysisError || "Analysis failed. You can still apply.");
      // Graceful fallback so the applicant is never blocked from applying.
      setAtsScore(50);
      setAtsFeedback({
        overallScore: 50,
        ATS: {
          score: 50,
          tips: [{ type: "warning", tip: "Analysis failed. Your resume has been saved but not analyzed." }],
        },
        content: { score: 50, tips: [] },
        skills: { score: 50, tips: [] },
        structure: { score: 50, tips: [] },
        toneAndStyle: { score: 50, tips: [] },
      });
      toast.error("Analysis failed. Resume saved — you can still apply.");
    } else if (analyzingResume.analysisStatus === "processing") {
      setStatusText("Analyzing your resume with AI...");
    }
  }, [analyzingResume, step]);

  const generateUploadUrl = useMutation(api.jobs.generateUploadUrl);
  const uploadResume = useMutation(api.resumes.uploadResume);
  const createApplication = useMutation(api.applications.createApplication);

  useEffect(() => {
    if (userResume) {
      setHasExistingResume(true);
    }
  }, [userResume]);

  // Simulate upload progress
  useEffect(() => {
    if (isUploading && uploadProgress < 100) {
      const timer = setTimeout(() => {
        setUploadProgress(prev => Math.min(prev + 10, 100));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isUploading, uploadProgress]);

  // Reset error when retrying
  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
    if (selectedFile) {
      handleAnalyzeResume(selectedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      
      setSelectedFile(file);
      handleAnalyzeResume(file);
    }
  };

  // ── Upload helper ──────────────────────────────────────────────
  // IMPORTANT: Convex's generateUploadUrl endpoint expects the RAW file
  // bytes with an explicit Content-Type header — NOT a FormData-wrapped
  // body. Wrapping in FormData causes the browser to set
  // "Content-Type: multipart/form-data; boundary=..." and store the
  // entire multipart envelope (boundaries included) as the file content,
  // which corrupts every upload. Always POST the File object directly.
  const uploadFileDirectly = async (file: File): Promise<Id<"_storage">> => {
    const postUrl = await generateUploadUrl();

    const uploadResponse = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const { storageId } = await uploadResponse.json();
    return storageId as Id<"_storage">;
  };

  const handleAnalyzeResume = async (file: File) => {
    setIsAnalyzing(true);
    setIsUploading(true);
    setUploadProgress(0);
    setStep("analyze");
    setError(null);
    setStatusText("Uploading your resume...");
    
    try {
      // Step 1: Upload file to Convex
      setStatusText("Uploading file to storage...");
      setUploadProgress(20);
      
      
      const fileStorageId = await uploadFileDirectly(file);
      setUploadProgress(50);
      // Step 2: Create resume record
      setStatusText("Creating resume record...");
      setUploadProgress(60);
      
      const newResumeId = await uploadResume({
        userId: user?.id || "",
        fileStorageId: fileStorageId,
        jobTitle: jobTitle,
        companyName: companyName,
        jobDescription: "",
      });
      
      setResumeId(newResumeId);
      setUploadProgress(70);
      
        // Step 3: Schedule background analysis. This returns almost
      // immediately — the reactive useEffect above (watching
      // analyzingResume.analysisStatus) will pick up the result and
      // move to the "review" step once it lands.
      setStatusText("Starting AI analysis...");
      setUploadProgress(80);

      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
         fileStorageId: fileStorageId,
          jobTitle: jobTitle,
          jobDescription: "",
          resumeId: newResumeId,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start analysis");
      }

      setUploadProgress(90);
      setStatusText("Analyzing your resume with AI...");
      // Intentionally do NOT setStep("review") here — the useEffect
      // above transitions state once analysisStatus resolves.
 
      
    } catch (error) {
      console.error("Analysis error:", error);
      setError(error instanceof Error ? error.message : "Failed to analyze resume. Please try again.");
      toast.error("Failed to analyze resume. Please try again.");
      
      // Even on error, if we have a resumeId, we can still proceed
      if (resumeId) {
        // Use basic fallback feedback
        setAtsScore(50);
        setAtsFeedback({
          overallScore: 50,
          ATS: { 
            score: 50, 
            tips: [
              { type: "warning", tip: "Analysis failed. Your resume has been saved but not analyzed." }
            ] 
          },
          content: { score: 50, tips: [] },
          skills: { score: 50, tips: [] },
          structure: { score: 50, tips: [] },
          toneAndStyle: { score: 50, tips: [] }
        });
        setStep("review");
        toast.error("Resume saved but analysis incomplete. You can still apply.");
      } else {
        setStep("upload");
      }
   
    }
  };

  const handleSubmitApplication = async () => {
    if (!user?.id) {
      toast.error("Please sign in to apply");
      return;
    }

    setIsSubmitting(true);
    setStatusText("Submitting your application...");
    
    try {
      let resumeFileId: Id<"_storage"> | undefined;
      let existingResumeId: Id<"resumes"> | undefined;

      // If user chose to use existing resume
      if (useExistingResume && hasExistingResume && userResume?.fileStorageId) {
        resumeFileId = userResume.fileStorageId;
        existingResumeId = userResume._id;
        setResumeId(existingResumeId);
      } else if (selectedFile) {
        // File should already be uploaded from the analyze step
        if (!resumeId) {
          // Fallback: upload the file
          const fileStorageId = await uploadFileDirectly(selectedFile);
          resumeFileId = fileStorageId;

          const newResumeId = await uploadResume({
            userId: user.id,
            fileStorageId: resumeFileId,
            jobTitle: jobTitle,
            companyName: companyName,
            jobDescription: "",
          });
          
          setResumeId(newResumeId);
        } else {
          // Use existing resumeId from analysis step
          resumeFileId = userResume?.fileStorageId;
        }
      }

      if (!resumeId && !existingResumeId) {
        throw new Error("Failed to create resume record");
      }

      const finalResumeId = resumeId || existingResumeId;

      // Create application
      await createApplication({
        userId: user.id,
        jobId: jobId,
        status: "applied",
        notes: "",
        candidateName: user.fullName || "",
        candidateEmail: user.emailAddresses?.[0]?.emailAddress || "",
        resumeFileId: resumeFileId,
      });
      
      setStep("success");
      toast.success("Application submitted successfully!");
      
      if (onApplySuccess) onApplySuccess();
      
      // Navigate to results page after delay
      setTimeout(() => {
        if (finalResumeId) {
          router.push(`/results/${finalResumeId}`);
        }
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error("Application error:", error);
      const msg = error instanceof Error ? error.message : "Failed to submit application";
      if (msg.startsWith("ALREADY_APPLIED:")) {
        const count = msg.split(":")[1];
        setError(`You've already applied to this job.`);
        toast.error(`You've already applied to this job. (Attempt #${count} blocked)`);
      } else {
        setError(msg);
        toast.error("Failed to submit application. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4 p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Apply for {jobTitle}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Error Display with Retry */}
        {error && step !== "success" && (
          <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-700 dark:text-rose-400">{error}</p>
                <button
                  onClick={handleRetry}
                  className="mt-2 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          {["Upload", "Analyze", "Review", "Submit"].map((label, index) => {
            const stepIndex = step === "upload" ? 0 : step === "analyze" ? 1 : step === "review" ? 2 : 3;
            const isActive = index <= stepIndex;
            const isCurrent = index === stepIndex;
            
            return (
              <div key={label} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                } ${isCurrent ? "ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-zinc-900" : ""}`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
                } hidden sm:inline`}>
                  {label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    isActive ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Status Text */}
        {statusText && step === "analyze" && (
          <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {statusText}
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              {hasExistingResume ? (
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-white">Existing Resume Found</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        You have a resume on file. Would you like to use it or upload a new one?
                      </p>
                      <div className="flex gap-4 mt-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={useExistingResume}
                            onChange={() => setUseExistingResume(true)}
                            className="w-4 h-4 text-indigo-600"
                          />
                          Use existing
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={!useExistingResume}
                            onChange={() => setUseExistingResume(false)}
                            className="w-4 h-4 text-indigo-600"
                          />
                          Upload new
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Upload your resume/CV to apply for this position
                  </p>
                </div>
              )}

              {(!useExistingResume || !hasExistingResume) && (
                <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center hover:border-indigo-500 transition cursor-pointer">
                  <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Drag & drop your resume here, or click to browse
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    Supports PDF, DOC, DOCX (Max 5MB)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}

              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setStep("upload");
                      setError(null);
                    }}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (useExistingResume && hasExistingResume && userResume) {
                      setResumeId(userResume._id);
                      // Use fallback score for existing resume if no analysis
                      setAtsScore(70);
                      setAtsFeedback({
                        overallScore: 70,
                        ATS: { score: 70, tips: [{ type: "good", tip: "Using existing resume. You can still apply." }] },
                        content: { score: 70, tips: [] },
                        skills: { score: 70, tips: [] },
                        structure: { score: 70, tips: [] },
                        toneAndStyle: { score: 70, tips: [] }
                      });
                      setStep("review");
                    } else if (selectedFile) {
                      handleAnalyzeResume(selectedFile);
                    } else {
                      toast.error("Please upload a resume or use your existing one");
                    }
                  }}
                  disabled={!selectedFile && !(useExistingResume && hasExistingResume)}
                  className="gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Analyze */}
          {step === "analyze" && (
            <div className="text-center py-8">
              {isAnalyzing || isUploading ? (
                <>
                  <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    {statusText || "Analyzing Your Resume"}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                    We're checking your resume against the job requirements...
                  </p>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 mt-4">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">{uploadProgress}%</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <CheckCircle className="w-16 h-16 text-emerald-500" />
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    {error ? "Analysis Incomplete" : "Analysis Complete!"}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {error ? "Your resume was saved but analysis encountered an issue." : "We've analyzed your resume against the job requirements."}
                  </p>
                  <Button onClick={() => setStep("review")}>
                    {error ? "Continue Anyway" : "View Results"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review - SAME AS BEFORE */}
          {step === "review" && (
            <div className="space-y-4">
              {atsScore !== null && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume Quality Score</p>
                      <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{atsScore}%</p>
                    </div>
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                      style={{ width: `${atsScore}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {atsFeedback?.ATS?.tips?.slice(0, 3).map((tip: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
                        {tip.tip}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    Want to improve your score?{" "}
                    {resumeId ? (
                      <Link href={`/results/${resumeId}`} className="font-medium underline hover:no-underline">
                        Get detailed feedback
                      </Link>
                    ) : (
                      <Link href="/upload" className="font-medium underline hover:no-underline">
                        Get detailed feedback
                      </Link>
                    )}
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmitApplication}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Submit Application
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Application Submitted! 🎉
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                Your application for <strong>{jobTitle}</strong> has been sent successfully.
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                The employer will review your resume and get back to you soon.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}