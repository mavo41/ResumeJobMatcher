"use client"
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";

// Interfaces based on Convex schema
interface Job {
  _id: Id<"jobs">;
  title: string;
  company: string;
  location: string;
  postedAt: number;
  description: string;
  status: "open" | "closed" | "draft";
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
  const jobs = useQuery(api.jobs.getOpenJobs) || [];
  const userApplications = useQuery(api.applications.getUserApplications, { userId: "user1" }) || []; // Replace with Clerk user ID
  const createApplication = useMutation(api.applications.createApplication);
  const updateApplicationStatus = useMutation(api.applications.updateApplicationStatus);

  // State for job details panel
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Category counts
  const counts = {
    Recommended: jobs.length,
    Shortlisted: userApplications.filter(a => a.status === "shortlisted").length,
    Applied: userApplications.filter(a => a.status === "applied").length,
    Bookmarked: userApplications.length,
    Interviewing: userApplications.filter(a => a.status === "interviewing").length,
    Offers: userApplications.filter(a => a.status === "offer").length,
    Rejected: userApplications.filter(a => a.status === "rejected").length,
    Accepted: userApplications.filter(a => a.status === "accepted").length,
  };

  // Quick action handlers
  const handleBookmark = async (jobId: Id<"jobs">) => {
    await createApplication({
      userId: "user1", // Replace with Clerk user ID
      jobId,
      status: "shortlisted",
      notes: "",
    });
  };

  const handleApply = async (jobId: Id<"jobs">) => {
    await createApplication({
      userId: "user1", // Replace with Clerk user ID
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

  const handleUpdateNotes = async (applicationId: Id<"applications">, notes: string) => {
    await updateApplicationStatus({
      applicationId,
      status: userApplications.find(a => a._id === applicationId)?.status || "shortlisted",
      notes,
    });
  };

  // Job selection for details
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
                {userApplications.map(app => {
                  const job = jobs.find(j => j._id === app.jobId);
                  return (
                    <tr key={app._id} className="border-b">
                      <td className="p-2">{job?.title}</td>
                      <td className="p-2">{job?.company}</td>
                      <td className="p-2">{job?.location}</td>
                      <td className="p-2">
                        <select
                          value={app.status}
                          onChange={(e) => handleReject(app._id)} // Simplified for MVP; expand later
                          className="border rounded p-1"
                        >
                          {["shortlisted", "applied", "interviewing", "offer"].map(status => (
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
                          onClick={() => handleApply(app.jobId)}
                          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleReject(app._id)}
                          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        >
                          Reject
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

      {/* Job Matches + Recommended Jobs */}
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Left Panel: Job List */}
        <div className="w-full md:w-1/2 p-4 md:p-6 bg-white">
          <h1 className="text-2xl font-bold mb-4">Job Matches</h1>
          <div className="space-y-4">
            {jobs.map(job => (
              <div
                key={job._id}
                onClick={() => handleSelectJob(job)}
                className="p-4 bg-gray-50 rounded-lg shadow hover:bg-gray-100 cursor-pointer transition"
              >
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{job.title}</h2>
                    <p className="text-gray-600">{job.company} • {job.location}</p>
                    <p className="text-sm text-gray-500">
                      Posted: {format(new Date(job.postedAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      job.tag === "MATCH" ? "bg-blue-200 text-blue-800" : "bg-green-200 text-green-800"
                    }`}
                  >
                    {job.tag || "RECOMMENDED"} {/* Fallback tag */}
                  </span>
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmark(job._id);
                    }}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                  >
                    Bookmark
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(job._id);
                    }}
                    className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Job Details */}
        <div
          className={`fixed md:relative w-full md:w-1/2 p-4 md:p-6 bg-white transition-transform duration-300 ${
            isDetailsOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
          }`}
        >
          <button
            className="md:hidden mb-4 text-blue-500"
            onClick={() => setIsDetailsOpen(false)}
          >
            Close
          </button>
          {selectedJob ? (
            <div>
              <img
                src="https://via.placeholder.com/50"
                alt="Company Logo"
                className="w-12 h-12 mb-4"
              />
              <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
              <p className="text-gray-600">{selectedJob.company}</p>
              <p className="text-gray-600">{selectedJob.location}</p>
              <p className="text-sm text-gray-500 mb-4">
                Posted: {format(new Date(selectedJob.postedAt), "MMM dd, yyyy")}
              </p>
              <h3 className="text-lg font-semibold">Role Summary</h3>
              <p className="text-gray-700">{selectedJob.description}</p>
            </div>
          ) : (
            <p className="text-gray-500">Select a job to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}