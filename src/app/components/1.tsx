'use client';

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import Link from "next/link";

// Interfaces
interface Job {
  _id: Id<"jobs">;
  title: string;
  company: string;
  location: string;
  postedAt: number;
  description: string;
  status: "open" | "closed" | "draft";
  tag?: "MATCH" | "RECOMMENDED";
  createdAt: number;
  updatedAt: number;
}

interface Application {
  _id: Id<"applications">;
  userId: string;
  jobId: Id<"jobs">;
  status:
    | "shortlisted"
    | "applied"
    | "interviewing"
    | "offer"
    | "rejected"
    | "accepted";
  notes?: string;
  savedAt: number;
  updatedAt: number;
}

export default function JobBoard() {
  const jobs =
    useQuery(api.jobs.getOpenJobs, { cursor: undefined, limit: 20 }) || {
      page: [],
    };
  const userApplications =
    useQuery(api.applications.getUserApplications, { userId: "user1" }) || [];
  const createApplication = useMutation(api.applications.createApplication);

  // Side panel state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Category counts
  const counts = {
    Recommended: jobs.page.length,
    Shortlisted: userApplications.filter(
      (a: Application) => a.status === "shortlisted"
    ).length,
    Applied: userApplications.filter(
      (a: Application) => a.status === "applied"
    ).length,
    Bookmarked: userApplications.length,
    Interviewing: userApplications.filter(
      (a: Application) => a.status === "interviewing"
    ).length,
    Offers: userApplications.filter(
      (a: Application) => a.status === "offer"
    ).length,
    Rejected: userApplications.filter(
      (a: Application) => a.status === "rejected"
    ).length,
    Accepted: userApplications.filter(
      (a: Application) => a.status === "accepted"
    ).length,
  };

  // Handlers
  const handleBookmark = async (jobId: Id<"jobs">) => {
    await createApplication({
      userId: "user1",
      jobId,
      status: "shortlisted",
      notes: "",
    });
  };

  const handleApply = async (jobId: Id<"jobs">) => {
    await createApplication({
      userId: "user1",
      jobId,
      status: "applied",
      notes: "",
    });
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Job Tracker Board */}
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Job Tracker Board</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(counts).map(([category, count]) => (
            <div
              key={category}
              className="bg-white p-4 rounded-lg shadow hover:bg-blue-50 cursor-pointer transition"
            >
              <h2 className="text-lg font-semibold">{category}</h2>
              <p className="text-2xl">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Job Matches (compact panel) */}
      <div className="p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-3">Job Matches For You</h2>
        <div className="bg-white rounded-lg shadow p-4 max-h-96 overflow-y-auto space-y-3">
          {jobs.page.map((job: Job) => (
            <div
              key={job._id}
              onClick={() => handleSelectJob(job)}
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{job.title}</h3>
                  <p className="text-sm text-gray-600">
                    {job.company} • {job.location}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(job.postedAt), "MMM dd, yyyy")}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    job.tag === "MATCH"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {job.tag || "RECOMMENDED"}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmark(job._id);
                  }}
                  className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                >
                  Bookmark
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(job._id);
                  }}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* See all jobs link */}
        <div className="mt-4 text-center">
          <Link
            href="/jobs"
            className="text-blue-600 hover:underline font-medium"
          >
            See all jobs →
          </Link>
        </div>
      </div>

      {/* Right Side Job Details Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-1/3 bg-white shadow-xl p-6 transform transition-transform duration-300 ${
          isDetailsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          onClick={() => setIsDetailsOpen(false)}
          className="text-gray-500 hover:text-gray-700 mb-4"
        >
          Close
        </button>
        {selectedJob ? (
          <div>
            <h2 className="text-xl font-bold mb-1">{selectedJob.title}</h2>
            <p className="text-gray-600">{selectedJob.company}</p>
            <p className="text-gray-500 text-sm mb-2">
              {selectedJob.location} •{" "}
              {format(new Date(selectedJob.postedAt), "MMM dd, yyyy")}
            </p>
            <a
              href="#"
              className="text-blue-500 text-sm underline"
              target="_blank"
            >
              View original posting
            </a>
            <h3 className="mt-4 font-semibold">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {selectedJob.description}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Select a job to view details</p>
        )}
      </div>
    </div>
  );
}
