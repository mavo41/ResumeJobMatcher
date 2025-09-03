"use client";

import { FormEvent, useState } from "react";
import Navbar from "../components/Navbar";
import FileUploader from "../components/FileUploader";
import { useConvexFileUploader } from "../lib/convexUpload";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { getFileFromConvexStorage,} from "../lib/getFileFromConvexStorage";
import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { X } from "lucide-react";

export default function UploadPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileStorageId, setFileStorageId] = useState<Id<"_storage"> | null>(null);

  const router = useRouter();

  // Hooks
  const { uploadFileToConvex } = useConvexFileUploader();
  const createResume = useMutation(api.resumes.createResume);
  const updateResumeFeedback = useMutation(api.resumes.updateResumeFeedback);
  const resumes = useQuery(api.resumes.getMyResumes) ?? [];
  const getFileUrl = useAction(api.resumes.getFileUrl); // For downloading

  // File selector
  const handleFileSelect = (f: File | null) => setFile(f);

  // Helper to reset the form state
  const handleResetState = () => {
    setIsLoading(false);
    setStatusText("");
    setFile(null);
    setCompanyName("");
    setJobTitle("");
    setJobDescription("");
    setFileStorageId(null);
  };

  // Main handler
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
    try {
      setIsLoading(true);
      setStatusText("Uploading your file...");

      if (!uploadFileToConvex) {
        setStatusText("Error: Failed to upload file");
        return;
      }

      // 1) Upload resume file
      const storageId = await uploadFileToConvex(file);

      // 2) Create resume record
      setStatusText("Saving resume metadata...");
      const resumeId = await createResume({
        companyName,
        jobTitle,
        jobDescription,
        fileStorageId: storageId,
      });

      // 3) Call API route → Gemini → feedback
      setStatusText("Analyzing your resume...");
      const aiRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileStorageId: storageId,
          jobTitle,
          jobDescription,
        }),
      });

      const data = await aiRes.json();
console.log("the data is here",data)
      if (!aiRes.ok) {
        throw new Error(data.error || "AI analysis failed");
      }

      // 4) Save feedback to Convex
      setStatusText("Saving feedback...");
      await updateResumeFeedback({ id: resumeId, feedback: data.feedback });

      // 5) Redirect to results page
      setStatusText("Analysis complete, redirecting...");
      router.push(`/results/${resumeId}`);

      // Reset state after a successful analysis and redirect
      handleResetState();
    } catch (e: any) {
      console.error(e);
      setStatusText(e.message ?? "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Form submit
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData(e.currentTarget);
    const companyName = (formData.get("company-name") as string) ?? "";
    const jobTitle = (formData.get("job-title") as string) ?? "";
    const jobDescription = (formData.get("job-description") as string) ?? "";

    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  // Save resume metadata
  const handleSaveResume = async () => {
    if (!fileStorageId) {
      alert("Please upload a resume file first");
      return;
    }
    setIsLoading(true);
    try {
      await createResume({
        companyName,
        jobTitle,
        jobDescription,
        fileStorageId,
      });
      // Convex auto-refreshes useQuery
      setCompanyName("");
      setJobTitle("");
      setJobDescription("");
      setFileStorageId(null);
    } catch (err) {
      console.error("Error saving resume:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Download file blob
  const handleDownload = async (storageId: Id<"_storage">) => {
    try {
      const fileContent = await getFileFromConvexStorage(storageId);
      let blob: Blob;

      if (fileContent.type === "text") {
        blob = new Blob([fileContent.data], { type: "text/plain" });
      } else {
        blob = new Blob([fileContent.data], { type: "application/octet-stream" });
      }

      const url = await getFileUrl({ storageId });
      if (url) {
        // Open the file in a new tab for the user to download
        window.open(url, "_blank");
      } else {
        alert("Could not get download URL.");
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. See console for details.");
    }
  };


  const archiveResume = useMutation(api.resumes.archiveResume);
  const deleteResume = useMutation(api.resumes.deleteResume);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>

          {isLoading ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" alt="" />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}

          {!isLoading && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                  className="text-black"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                  className="text-black"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  rows={6}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                  className="text-black"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>

              <button className="primary-button" type="submit" disabled={!file || isLoading}>
                Analyze Resume
              </button>
            </form>
          )}

          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Uploaded Resumes</h2>
            <ul className="space-y-2">
              {resumes.map((resume: {
                _id: Id<"resumes">;
                companyName: string;
                jobTitle: string;
                jobDescription: string;
                fileStorageId: Id<"_storage">;
                feedback?: any;
                createdAt: number;
                updatedAt: number;
                userId: string;
              }) => (
                <li
                  key={resume._id}
                  className="flex justify-between items-center bg-gray-100 p-3 rounded"
                >
                  <span>{resume.companyName} - {resume.jobTitle}</span>
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
          </div>
        </div>
      </section>
    </main>
  );
}
