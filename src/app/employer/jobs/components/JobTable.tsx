// app/employer/jobs/components/JobTable.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Calendar,
  MapPin,
  Globe,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  department?: string;
  status: "open" | "closed" | "draft";
  applications: number;
  views: number;
  postedAt: number;
  createdAt: number;
  updatedAt: number;
}

interface JobTableProps {
  jobs: Job[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onPublish?: (id: string) => void;
}

const JobStatusBadge = ({ status }: { status: string }) => {
  const variants = {
    open: {
      label: "Active",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
      icon: CheckCircle,
    },
    closed: {
      label: "Closed",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400",
      icon: XCircle,
    },
    draft: {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
      icon: Clock,
    },
  };

  const variant = variants[status as keyof typeof variants] || variants.draft;
  const Icon = variant.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${variant.className}`}>
      <Icon className="h-4 w-4" />
      {variant.label}
    </span>
  );
};

export default function JobTable({ jobs, onDelete, onStatusChange, onPublish }: JobTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  const handlePublish = async (jobId: string) => {
    setIsPublishing(jobId);
    try {
      await onStatusChange(jobId, "open");
      toast.success("🎉 Job published successfully! It is now visible to jobseekers.");
      if (onPublish) onPublish(jobId);
    } catch (error) {
      toast.error("Failed to publish job. Please try again.");
    } finally {
      setIsPublishing(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Job Title
              </th>
              <th className="hidden md:table-cell px-6 py-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Location
              </th>
              <th className="hidden sm:table-cell px-6 py-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Applicants
              </th>
              <th className="px-6 py-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Views
              </th>
              <th className="hidden lg:table-cell px-6 py-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Posted
              </th>
              <th className="px-6 py-4 text-right font-medium text-zinc-500 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {jobs.map((job) => (
              <tr
                key={job._id}
                className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-6 py-4">
                  <div>
                    <Link
                      href={`/employer/jobs/${job._id}`}
                      className="font-semibold text-zinc-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 text-base"
                    >
                      {job.title}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      <span>{job.company}</span>
                      {job.department && (
                        <>
                          <span>•</span>
                          <span>{job.department}</span>
                        </>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <MapPin className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm">{job.location}</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-6 py-4">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="font-semibold text-zinc-900 dark:text-white text-base">
                      {job.applications}
                    </span>
                  </div>
                </td>
                 <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Eye className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm">{job.views}</span>
                  </div>
                </td>
                <td className="hidden lg:table-cell px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{formatDistanceToNow(job.postedAt, { addSuffix: true })}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="relative flex items-center justify-end gap-3">
                    {/* Publish Button - Only for Draft jobs */}
                    {job.status === "draft" && (
                      <button
                        onClick={() => handlePublish(job._id)}
                        disabled={isPublishing === job._id}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 disabled:opacity-50"
                      >
                        {isPublishing === job._id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent dark:border-emerald-400" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                        {isPublishing === job._id ? "Publishing..." : "Publish"}
                      </button>
                    )}

                    {/* More Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === job._id ? null : job._id)}
                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {openMenuId === job._id && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-10">
                          <Link
                            href={`/employer/jobs/${job._id}`}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                          <Link
                            href={`/employer/jobs/${job._id}/edit`}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Edit className="h-4 w-4" />
                            Edit Job
                          </Link>
                          {job.status !== "closed" && (
                            <button
                              onClick={() => {
                                onStatusChange(job._id, "closed");
                                setOpenMenuId(null);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-amber-700 hover:bg-zinc-100 dark:text-amber-400 dark:hover:bg-zinc-800"
                            >
                              <XCircle className="h-4 w-4" />
                              Close Job
                            </button>
                          )}
                          {job.status === "closed" && (
                            <button
                              onClick={() => {
                                onStatusChange(job._id, "open");
                                setOpenMenuId(null);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 hover:bg-zinc-100 dark:text-emerald-400 dark:hover:bg-zinc-800"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Reopen Job
                            </button>
                          )}
                          <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
                          <button
                            onClick={() => {
                              onDelete(job._id);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-700 hover:bg-zinc-100 dark:text-rose-400 dark:hover:bg-zinc-800"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Job
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}