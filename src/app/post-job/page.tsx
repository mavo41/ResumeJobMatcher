"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { Id } from "../../../convex/_generated/dataModel";

type FormData = {
  title: string;
  company: string;
  location: string;
  jobType: string;
  description: string;
  requirements: string;
  salaryRange?: string;
  logo?: FileList;
};

export default function PostJob() {
  const { userId } = useAuth();
  const router = useRouter();
  const user = useQuery(api.users.getUser, userId ? { userId } : "skip");
  const createJob = useMutation(api.jobs.createJob);
  const generateUploadUrl = useMutation(api.jobs.generateUploadUrl);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const employerProfile = useQuery(
    api.employers.getEmployerByUserId,
    userId ? { userId } : "skip"
  );

  // Redirect if not logged in
  useEffect(() => {
    if (userId === null) {
      router.push("/sign-in?redirect=/post-job");
    }
  }, [userId, router]);

  // Prevent non-employers from accessing
  useEffect(() => {
    if (user && user.role !== "employer") {
      toast.error("Only employers can post jobs.");
      router.push("/");
    }
  }, [user, router]);

  // Set company name from employer profile when it loads
  useEffect(() => {
    if (employerProfile?.companyName) {
      setValue("company", employerProfile.companyName);
    }
  }, [employerProfile, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!userId) return;

    setIsSubmitting(true);
    try {
      let logoUrl: Id<"_storage"> | undefined;

      if (data.logo?.[0]) {
        const postUrl = await generateUploadUrl();
        const response = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Content-Type": data.logo[0].type,
          },
          body: data.logo[0],
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const { storageId } = await response.json();
        logoUrl = storageId as Id<"_storage">;
      }

      const now = Date.now();

      await createJob({
        userId: userId,
        title: data.title,
        company: data.company,
        jobType: data.jobType || "Full-time",
        location: data.location,
        description: data.description,
        requirements: data.requirements.split(",").map((r) => r.trim()),
        salaryRange: data.salaryRange || undefined,
        logoUrl,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
      toast.success("Job saved as draft");
      router.push("/employer/dashboard");
    } catch (error) {
      toast.error("Failed to post job. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userId || (user && user.role !== "employer")) {
    return null;
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
          Post a Job
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-lg">
          Create a new job listing to find the perfect candidate
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Two Column Layout for basic info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Job Title */}
          <div className="md:col-span-2">
            <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register("title", { required: "Title is required" })}
              placeholder="e.g., Senior Software Engineer"
              className="w-full rounded-xl border-2 border-zinc-300 bg-white px-5 py-4 text-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition placeholder:text-zinc-400"
            />
            {errors.title && <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Company */}
          <div>
            <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              {...register("company", { required: "Company is required" })}
              placeholder="Your company name"
              className="w-full rounded-xl border-2 border-zinc-300 bg-white px-5 py-4 text-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition placeholder:text-zinc-400"
            />
            {errors.company && <p className="mt-1.5 text-sm text-red-500">{errors.company.message}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              {...register("location", { required: "Location is required" })}
              placeholder="Nairobi-Kenya,CA(Remote)"
              className="w-full rounded-lg border-2 border-zinc-300 bg-white px-5 py-4 text-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition placeholder:text-zinc-400"
            />
            {errors.location && <p className="mt-1.5 text-sm text-red-500">{errors.location.message}</p>}
          </div>
        </div>

        {/* Job Type */}
        <div>
          <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Job Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register("jobType")}
            className="w-full rounded-xl border-2 border-zinc-300 bg-white px-5 py-4 text-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition"
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>

        {/* Description - Large textarea */}
        <div>
          <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Job Description <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register("description", { required: "Description is required" })}
            rows={10} cols={200}
            placeholder="Describe the role, responsibilities, and what makes this opportunity unique..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
          {errors.description && <p className="mt-1.5 text-sm text-red-500">{errors.description.message}</p>}
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Requirements <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register("requirements", { required: "Requirements are required" })}
            rows={10} cols={200}
            placeholder="e.g., 5+ years React, TypeScript, Leadership experience"
            className="w-full rounded-xl border-2 border-zinc-300 bg-white px-5 py-4 text-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition placeholder:text-zinc-400"
          />
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Separate requirements with commas</p>
          {errors.requirements && <p className="mt-1.5 text-sm text-red-500">{errors.requirements.message}</p>}
        </div>

        {/* Two Column for Salary and Logo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Salary Range */}
          <div>
            <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Salary Range <span className="text-zinc-400 text-sm font-normal">(optional)</span>
            </label>
            <input
              {...register("salaryRange")}
              placeholder="e.g., Ksh80,000 - Ksh120,000"
              className="w-full rounded-xl border-2 border-zinc-300 bg-white px-5 py-4 text-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition placeholder:text-zinc-400"
            />
          </div>

          {/* Company Logo */}
          <div>
            <label className="block text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Company Logo <span className="text-zinc-400 text-sm font-normal">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              {...register("logo")}
              className="w-full rounded-xl border-2 border-zinc-300 bg-white px-5 py-4 text-lg dark:border-zinc-700 dark:bg-zinc-800 dark:text-white file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-5 file:py-3 file:text-base file:font-medium file:text-indigo-600 hover:file:bg-indigo-100 dark:file:bg-indigo-950/50 dark:file:text-indigo-400 transition"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white font-semibold rounded-xl transition-colors text-lg shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
          >
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/employer/dashboard")}
            className="flex-1 sm:flex-none px-10 py-4 border-2 border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl transition-colors text-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}