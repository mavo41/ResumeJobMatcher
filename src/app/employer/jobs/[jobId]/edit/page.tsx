// app/employer/jobs/[jobId]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/Skeleton";

type FormData = {
  title: string;
  location: string;
  jobType: string;
  description: string;
  requirements: string;
  salaryRange?: string;
};

export default function EditJobPage() {
  const { jobId } = useParams();
  const { userId } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch job details
  const job = useQuery(api.jobs.getJobById, {
    jobId: jobId as Id<"jobs">,
  });

  const updateJob = useMutation(api.jobs.updateJob);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();

  // Populate form with job data
  useEffect(() => {
    if (job) {
      setValue("title", job.title);
      setValue("location", job.location);
      setValue("jobType", job.jobType || "Full-time");
      setValue("description", job.description);
      setValue("requirements", job.requirements?.join(", ") || "");
      setValue("salaryRange", job.salaryRange || "");
    }
  }, [job, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await updateJob({
        jobId: jobId as string,
        title: data.title,
        location: data.location,
        jobType: data.jobType, // Now this is accepted
        description: data.description,
        requirements: data.requirements.split(",").map((r) => r.trim()),
        salaryRange: data.salaryRange || undefined,
      });
      toast.success("Job updated successfully!");
      router.push(`/employer/jobs/${jobId}`);
    } catch (error) {
      toast.error("Failed to update job");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (job === undefined) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold">Job Not Found</h2>
        <Link href="/employer/jobs" className="text-indigo-600 hover:underline mt-4 inline-block">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Link
        href={`/employer/jobs/${jobId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Job Details
      </Link>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          Edit Job: {job.title}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Job Title *
            </label>
            <input
              {...register("title", { required: "Title is required" })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Location *
            </label>
            <input
              {...register("location", { required: "Location is required" })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Job Type *
            </label>
            <select
              {...register("jobType")}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Job Description *
            </label>
            <textarea
              {...register("description", { required: "Description is required" })}
              rows={10} cols={200}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Requirements (comma-separated) *
            </label>
            <textarea
              {...register("requirements", { required: "Requirements are required" })}
              rows={10} cols={200}
                            placeholder="e.g., 5+ years React, TypeScript, Leadership experience"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            {errors.requirements && <p className="text-sm text-red-500 mt-1">{errors.requirements.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Salary Range (optional)
            </label>
            <input
              {...register("salaryRange")}
              placeholder="e.g., $80,000 - $120,000"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Link href={`/employer/jobs/${jobId}`}>
              <Button type="button" variant="outline" className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}