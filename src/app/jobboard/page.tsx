'use client';

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, MapPin, Clock } from "lucide-react";

// Interfaces based on Convex schema
interface Job {
  _id: Id<"jobs">;
  title: string;
  company: string;
  location: string;
  postedAt: number;
  description: string;
  status: "open" | "closed" | "draft";
  tag?: "MATCH" | "RECOMMENDED" | undefined;
  createdAt: number;
  updatedAt: number;
}

interface Application {
  _id: Id<"applications">;
  userId: string;
  jobId: Id<"jobs">;
  status: "shortlisted" | "applied" | "interviewing" | "offer" | "rejected" | "accepted";
  notes?: string;
  savedAt: number;
  updatedAt: number;
}

export default function JobMatcher() {
  // Convex queries
  const jobs = useQuery(api.jobs.getOpenJobs, { cursor: undefined, limit: 100 }) || { page: [] };
  const userApplications = useQuery(api.applications.getUserApplications, { userId: "user1" }) || [];
  const createApplication = useMutation(api.applications.createApplication);
  const updateApplicationStatus = useMutation(api.applications.updateApplicationStatus);
  const deleteApplication = useMutation(api.applications.deleteApplication);

  // State for job details panel
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // New state for current filter
  const [currentFilter, setCurrentFilter] = useState<string>("Bookmarked");

  const router = useRouter();

  // Status map for filtering (category to status)
  const statusMap: Record<string, string> = {
    Shortlisted: "shortlisted",
    Applied: "applied",
    Interviewing: "interviewing",
    Offers: "offer",
    Rejected: "rejected",
    Accepted: "accepted",
  };

  // Filtered applications based on currentFilter
  const filteredApplications = currentFilter === "Bookmarked"
    ? userApplications
    : userApplications.filter((a: Application) => a.status === statusMap[currentFilter]);

  // Category counts
  const counts = {
    Recommended: jobs.page.length,
    Shortlisted: userApplications.filter((a: Application) => a.status === "shortlisted").length,
    Applied: userApplications.filter((a: Application) => a.status === "applied").length,
    Bookmarked: userApplications.length,
    Interviewing: userApplications.filter((a: Application) => a.status === "interviewing").length,
    Offers: userApplications.filter((a: Application) => a.status === "offer").length,
    Rejected: userApplications.filter((a: Application) => a.status === "rejected").length,
    Accepted: userApplications.filter((a: Application) => a.status === "accepted").length,
  };

  // Quick action handlers
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

  const handleReject = async (applicationId: Id<"applications">) => {
    await updateApplicationStatus({
      applicationId,
      status: "rejected",
      notes: undefined,
    });
  };

  const handleUpdateStatus = async (applicationId: Id<"applications">, status: Application["status"]) => {
    await updateApplicationStatus({
      applicationId,
      status,
      notes: undefined,
    });
  };

  const handleUpdateNotes = async (applicationId: Id<"applications">, notes: string) => {
    const app = userApplications.find((a: Application) => a._id === applicationId);
    await updateApplicationStatus({
      applicationId,
      status: app?.status || "shortlisted",
      notes,
    });
  };

  // Job selection for details
  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  const handleRemoveJob = async (applicationId: Id<"applications">) => {
    await deleteApplication({ applicationId });
  };

  // Handle stat card click
  const handleCardClick = (category: string) => {
    if (category === "Recommended") {
      router.push("/jobMatcher");
    } else {
      setCurrentFilter(category);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4 md:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Area (Job Board) */}
        <div className="w-full lg:w-3/4">
          <h1 className="text-2xl font-bold mb-4">Job Tracker Board</h1>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(counts).map(([category, count]) => (
              <div
                key={category}
                className="bg-white p-4 rounded-lg shadow hover:bg-blue-50 cursor-pointer transition"
                onClick={() => handleCardClick(category)}
              >
                <h2 className="text-lg font-semibold">{category}</h2>
                <p className="text-2xl">{count}</p>
              </div>
            ))}
          </div>

          {/* Bookmarked Jobs Table */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Bookmarked Jobs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Job Position</th>
                    <th className="p-2">Company</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Date Saved</th>
                    <th className="p-2">Notes</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app: Application) => {
                    const job = jobs.page.find((j: Job) => j._id === app.jobId);
                    if (!job) return null;
                    return (
                      <tr key={app._id} className="border-b">
                        <td className="p-2">{job.title}</td>
                        <td className="p-2">{job.company}</td>
                        <td className="p-2">{job.location}</td>
                        <td className="p-2">
                          <select
                            value={app.status}
                            onChange={(e) => handleUpdateStatus(app._id, e.target.value as Application["status"])}
                            className="border rounded p-1"
                          >
                            {["shortlisted", "applied", "interviewing", "offer", "rejected", "accepted"].map(status => (
                              <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">{format(new Date(app.savedAt), "MMM dd, yyyy")}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={app.notes || ""}
                            onChange={(e) => handleUpdateNotes(app._id, e.target.value)}
                            className="border rounded p-1 w-full"
                            placeholder="Add notes..."
                          />
                        </td>
                        <td className="p-2 flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(app.jobId);
                            }}
                            className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          >
                            Apply
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(app._id);
                            }}
                            className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                          >
                            Reject
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveJob(app._id);
                            }}
                            className="text-gray-500 hover:text-red-500 p-1"
                            title="Remove Job"
                          >
                            <X size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side Panel Area (Job Matches) */}
        <div className="w-full lg:w-1/4 bg-white p-4 rounded-lg shadow-lg flex flex-col">
          <h2 className="text-xl font-bold mb-4">Job Matches For You</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2"> {/* Custom scrollbar */}
            {jobs.page.slice(0, 7).map((job: Job) => (
              <div
                key={job._id}
                className="p-3 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 cursor-pointer transition border border-gray-200"
                onClick={() => handleSelectJob(job)} // This now opens the side panel
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-md font-semibold">{job.title}</h3>
                    <p className="text-gray-600 text-sm">{job.company}</p>
                    <p className="text-gray-500 text-xs flex items-center">
                      <MapPin size={12} className="inline mr-1" />
                      {job.location}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      job.tag === "MATCH" ? "bg-green-200 text-green-800" : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {job.tag || "RECOMMENDED"}
                  </span>
                </div>
                {/* Bookmarked and Apply buttons */}
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmark(job._id);
                    }}
                    className="flex-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded hover:bg-yellow-600 transition"
                  >
                    Bookmark
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(job._id);
                    }}
                    className="flex-1 bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t pt-4">
            <Link href="/jobs" passHref className="block w-full text-center py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              See All Jobs
            </Link>
          </div>
        </div>
      </div>

      {/* Modal/Side Panel for Job Details (Now a static right-side panel) */}
      {isDetailsOpen && selectedJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-lg transform transition-transform ease-in-out duration-300 translate-x-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
              <button onClick={() => setIsDetailsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <p className="text-gray-600">{selectedJob.company}</p>
                <span className="mx-2">•</span>
                <p className="text-gray-600">{selectedJob.location}</p>
              </div>
              <p className="text-sm text-gray-500 flex items-center">
                <Clock size={16} className="mr-1" /> Posted: {format(new Date(selectedJob.postedAt), "MMM dd, yyyy")}
              </p>
              <a href={""} className="text-blue-500 hover:underline text-sm block" target="_blank" rel="noopener noreferrer">
                View on Company Website
              </a>
              <div>
                <h3 className="text-lg font-semibold mt-4">Job Description</h3>
                <p className="text-gray-700 mt-2">{selectedJob.description}</p>
              </div>
              
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => {
                    handleApply(selectedJob._id);
                    setIsDetailsOpen(false);
                  }}
                  className="bg-blue-100 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    handleBookmark(selectedJob._id);
                    setIsDetailsOpen(false);
                  }}
                  className="bg-green-100 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Bookmark
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}