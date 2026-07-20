// app/employer/jobs/[jobId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import {
  Briefcase,
  MapPin,
  Calendar,
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowLeft,
  Edit,
  Trash2,
  Globe,
  XCircle,
  Users,
  Eye,
  Share2,
  Mail,
  Link as LinkIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function EmployerJobDetailPage() {
  const { jobId } = useParams();
  const { userId } = useAuth();
  const router = useRouter();

  // Fetch job details
  const job = useQuery(api.jobs.getJobById, {
    jobId: jobId as Id<"jobs">,
  });

  // Mutations
  const deleteJob = useMutation(api.jobs.deleteJob);
  const updateJobStatus = useMutation(api.jobs.updateJob);

 const viewCount = useQuery(api.jobs.getJobViewCount, { jobId: jobId as Id<"jobs"> });
  // Get applications for this job
  const applications = useQuery(
    api.applications.getJobApplications,
    jobId ? { jobId: jobId as Id<"jobs"> } : "skip"
  );

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    
    try {
      await deleteJob({ jobId: jobId as string });
      toast.success("Job deleted successfully");
      router.push("/employer/jobs");
    } catch (error) {
      toast.error("Failed to delete job");
      console.error(error);
    }
  };

  const handleStatusChange = async (newStatus: "open" | "closed" | "draft") => {
    try {
      await updateJobStatus({
        jobId: jobId as string,
        status: newStatus,
      });
      
      const statusMessages: Record<string, string> = {
        open: "🎉 Job published successfully!",
        closed: "Job closed successfully.",
        draft: "Job saved as draft.",
      };
      
      toast.success(statusMessages[newStatus] || `Job status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update job status");
      console.error(error);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/job/${jobId}`;
    navigator.clipboard.writeText(url);
    toast.success("Job link copied to clipboard!");
  };

  // Loading state
  if (job === undefined) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Job Not Found</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/employer/jobs">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/employer/jobs"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {job.status === "open" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </span>
              )}
              {job.status === "draft" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  <Clock className="h-3 w-3" />
                  Draft
                </span>
              )}
              {job.status === "closed" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                  <XCircle className="h-3 w-3" />
                  Closed
                </span>
              )}
              {job.tag && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  job.tag === "MATCH" 
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}>
                  {job.tag}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {job.company}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Posted {formatDistanceToNow(job.postedAt, { addSuffix: true })}
              </span>
              {job.salaryRange && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  {job.salaryRange}
                </span>
              )}
              {job.jobType && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {job.jobType}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {job.status === "draft" && (
              <Button
                onClick={() => handleStatusChange("open")}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Globe className="h-4 w-4" />
                Publish
              </Button>
            )}
            {job.status === "open" && (
              <Button
                onClick={() => handleStatusChange("closed")}
                variant="outline"
                className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <XCircle className="h-4 w-4" />
                Close Job
              </Button>
            )}
            {job.status === "closed" && (
              <Button
                onClick={() => handleStatusChange("open")}
                variant="outline"
                className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <CheckCircle className="h-4 w-4" />
                Reopen
              </Button>
            )}
            <Link href={`/employer/jobs/${job._id}/edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="gap-2 border-rose-500 text-rose-600 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-950/50">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Applications</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {applications?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950/50">
              <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Views</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{viewCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-950/50">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Posted</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {format(job.postedAt, "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Description */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
          Job Description
        </h2>
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {job.description}
          </p>
        </div>

        {job.requirements && job.requirements.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
              Requirements
            </h3>
            <ul className="space-y-2">
              {job.requirements.map((req: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Job ID: {job._id}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Updated {formatDistanceToNow(job.updatedAt, { addSuffix: true })}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/job/${jobId}`, "_blank");
              }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Public Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}