// app/employer/jobs/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  Briefcase,
} from "lucide-react";
import { toast } from "react-hot-toast";
import JobFilters from "./components/JobFilters";
import JobTable from "./components/JobTable";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { exportToCsv } from "../../lib/exportCsv";

interface Job {
  _id: Id<"jobs">;
  title: string;
  company: string;
  location: string;
  department?: string;
  status: "open" | "closed" | "draft";
  applications: number;
  postedAt: number;
  createdAt: number;
  updatedAt: number;
}

export default function JobsPage() {
  const { userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 10;

  // Fetch jobs
  const jobs = useQuery(
    api.jobs.getEmployerJobs,
    userId ? { employerId: userId } : "skip"
  );

   const jobIds = jobs?.map((j: any) => j._id) ?? [];
  const viewCounts = useQuery(
    api.jobs.getJobViewCounts,
    jobIds.length > 0 ? { jobIds } : "skip"
  );

  // Mutations
  const deleteJob = useMutation(api.jobs.deleteJob);
  const updateJobStatus = useMutation(api.jobs.updateJob);

  // Filter and paginate jobs
  const filteredJobs = jobs
    ?.filter((job: Job) => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a: Job, b: Job) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "most-applicants":
          return b.applications - a.applications;
        case "least-applicants":
          return a.applications - b.applications;
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil((filteredJobs?.length || 0) / pageSize);
  const paginatedJobs = filteredJobs?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle delete
  const handleDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    
    try {
      await deleteJob({ jobId: jobId as Id<"jobs"> });
      toast.success("Job deleted successfully");
    } catch (error) {
      toast.error("Failed to delete job");
      console.error(error);
    }
  };

  // Handle status change with specific success messages
  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await updateJobStatus({ 
        jobId: jobId as Id<"jobs">, 
        status: newStatus as "open" | "closed" | "draft" 
      });
      
      // Custom success message based on the status change
      const statusMessages: Record<string, string> = {
        open: "🎉 Job published successfully! It is now visible to jobseekers.",
        closed: "Job closed successfully.",
        draft: "Job saved as draft.",
      };
      
      toast.success(statusMessages[newStatus] || `Job status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update job status");
      console.error(error);
    }
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Loading state
  if (jobs === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Job Postings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredJobs?.length || 0} jobs • {jobs?.filter((j: Job) => j.status === "open").length || 0} active
          </p>
        </div>
        <div className="flex items-center gap-2">
         <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCsv(
                `jobs-${new Date().toISOString().slice(0, 10)}.csv`,
                (filteredJobs || []).map((j: any) => ({
                 Title: j.title,
                  Company: j.company,
                  Location: j.location,
                  Status: j.status,
                  Applicants: j.applications,
                  Posted: new Date(j.postedAt).toLocaleDateString(),
                }))
              )
            }
          >
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
          <Link href="/post-job">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Post New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search jobs by title, company, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <JobFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* Jobs Table */}
      {paginatedJobs && paginatedJobs.length > 0 ? (
        <>
          <JobTable
            jobs={paginatedJobs.map((j: any) => ({ ...j, views: viewCounts?.[j._id] ?? 0 }))}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredJobs?.length || 0)} of{" "}
                {filteredJobs?.length || 0} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
          <Briefcase className="h-12 w-12 text-zinc-400 dark:text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
            No jobs found
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by posting your first job"}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Link href="/post-job">
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}