// app/job/[jobId]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";import { useParams, useRouter } from "next/navigation";
import { getAnonymousId } from "../../lib/anonymousId";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
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
  Send,
  Bookmark,
  Share2,
  X,
  Eye,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/Skeleton";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const { userId } = useAuth();
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  // Fetch job details
  const job = useQuery(api.jobs.getJobById, {
    jobId: jobId as Id<"jobs">,
  });

  //tracking job views
 const recordJobView = useMutation(api.jobs.recordJobView);
   const hasTrackedView = useRef(false);
 
   useEffect(() => {
     if (!jobId || hasTrackedView.current) return;
     hasTrackedView.current = true;
    const viewerId = userId || getAnonymousId();
     recordJobView({ jobId: jobId as Id<"jobs">, viewerId }).catch(() => {});
   }, [jobId, userId]);
  // Fetch user's applications to check if already applied
  const userApplications = useQuery(
    api.applications.getUserApplications,
    userId ? { userId } : "skip"
  );

  // Mutations
  const createApplication = useMutation(api.applications.createApplication);
  const updateApplicationStatus = useMutation(api.applications.updateApplicationStatus);

  // Check if user has already applied or bookmarked
  useEffect(() => {
    if (userApplications && jobId) {
      const existing = userApplications.find(
        (app: any) => app.jobId === jobId
      );
      if (existing) {
        setApplicationStatus(existing.status);
        setIsBookmarked(existing.status === "shortlisted");
      }
    }
  }, [userApplications, jobId]);

  const handleApply = async () => {
    if (!userId) {
      toast.error("Please sign in to apply");
      router.push("/sign-in");
      return;
    }

    if (job?.source && job?.externalUrl) {
     window.open(job.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setIsApplying(true);
    try {
      await createApplication({
        userId,
        jobId: jobId as Id<"jobs">,
        status: "applied",
        notes: "",
      });
      setApplicationStatus("applied");
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error("Failed to apply. Please try again.");
      console.error(error);
    } finally {
      setIsApplying(false);
    }
  };
  const jobApplications = useQuery(
    api.applications.getJobApplications,
    jobId ? { jobId: jobId as Id<"jobs"> } : "skip"
  );


  const handleBookmark = async () => {
    if (!userId) {
      toast.error("Please sign in to bookmark");
      router.push("/sign-in");
      return;
    }

    try {
      if (isBookmarked) {
        // Remove bookmark (revert to applied or delete)
        if (applicationStatus === "shortlisted") {
          // Option 1: Update to applied
          const existing = userApplications?.find((app: any) => app.jobId === jobId);
          if (existing) {
            await updateApplicationStatus({
              applicationId: existing._id,
              status: "applied",
            });
            setApplicationStatus("applied");
          }
        }
        setIsBookmarked(false);
        toast.success("Bookmark removed");
      } else {
        if (applicationStatus) {
          // Update existing application to shortlisted
          const existing = userApplications?.find((app: any) => app.jobId === jobId);
          if (existing) {
            await updateApplicationStatus({
              applicationId: existing._id,
              status: "shortlisted",
            });
            setApplicationStatus("shortlisted");
          }
        } else {
          // Create new bookmark
          await createApplication({
            userId,
            jobId: jobId as Id<"jobs">,
            status: "shortlisted",
            notes: "",
          });
          setApplicationStatus("shortlisted");
        }
        setIsBookmarked(true);
        toast.success("Job bookmarked!");
      }
    } catch (error) {
      toast.error("Failed to update bookmark");
      console.error(error);
    }
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
          <Link href="/jobboard">
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
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/jobboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {job.status === "open" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Active
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
               <div className="bg-white dark:bg-zinc-100 rounded-xl border border-zinc-50 dark:border-zinc-800 p-4">
           <div className="flex items-center gap-3">
             <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950/50">
               <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
             </div>
             <div>
               {jobApplications === undefined ? (
                <p className="text-sm text-zinc-400">Loading applicant activity...</p>
              ) : jobApplications.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Be the first to apply
               </p>
              ) : applicationStatus === "applied" || applicationStatus === "accepted" ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-white">You</span>
                  {jobApplications.length > 1 && (
                    <>
                      {" "}
                      + <span className="font-semibold text-zinc-900 dark:text-white">
                        {jobApplications.length - 1}
                      </span>{" "}
                      other{jobApplications.length - 1 === 1 ? "" : "s"}
                    </>
                  )}{" "}
                  {jobApplications.length > 1 ? "have" : "has"} applied
               </p>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {jobApplications.length}
                  </span>{" "}
                  {jobApplications.length === 1 ? "person has" : "people have"} applied
                </p>
              )}
             </div>
           </div>
         </div>

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
          <div className="flex flex-col sm:flex-row gap-2">
            {job.status === "open" && (
              <>
                <Button
                  onClick={handleBookmark}
                  variant={isBookmarked ? "default" : "outline"}
                  className="gap-2"
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </Button>
                {/* <Button
                  onClick={handleApply}
                  disabled={isApplying || applicationStatus === "applied" || applicationStatus === "shortlisted"}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  {isApplying ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {applicationStatus === "applied" || applicationStatus === "shortlisted"
                    ? "Applied"
                    : "Apply Now"}
                </Button> */}
              </>
            )}
            {job.status !== "open" && (
              <div className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                This position is no longer accepting applications
              </div>
            )}
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

        {/* Share Button */}
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Posted {format(job.postedAt, "MMMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied to clipboard!");
            }}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}