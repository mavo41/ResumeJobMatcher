// app/jobs/page.tsx
'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { Clock, MapPin, ZapIcon, Eye, Send, Bookmark, X } from 'lucide-react';
import ApplyModal from "../components/ApplyModal";
import { useAuth } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';

interface Job {
  _id: Id<"jobs">;
  _creationTime: number;
  title: string;
  company: string;
  location: string;
  postedAt: number;
  description: string;
  status: string;
  tag?: string;
  logoUrl?: Id<"_storage">;
}

interface Application {
  _id: Id<"applications">;
  userId: string;
  jobId: Id<"jobs">;
  status: "shortlisted" | "applied" | "interviewing" | "offer" | "rejected" | "accepted" | "reviewed";
  notes?: string;
  savedAt: number;
  updatedAt: number;
}

export default function JobsPage() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<Job | null>(null);
  const jobsPerPage = 8;

  // Fetch jobs and applications
  const jobs = useQuery(api.jobs.getOpenJobs, { cursor: undefined, limit: 100 }) || { page: [] };
  const createApplication = useMutation(api.applications.createApplication);
  const userApplications = useQuery(
    api.applications.getUserApplications,
    userId ? { userId } : "skip"
  ) || [];

  // Filter and paginate jobs
  const filteredJobs = jobs.page.filter((job: Job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterTag === 'all' || job.tag === filterTag;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const currentJobs = filteredJobs.slice(
    (currentPage - 1) * jobsPerPage,
    currentPage * jobsPerPage
  );

  // Application progress
  const applicationProgress = {
    applied: userApplications.filter((a: Application) => a.status === "applied").length,
    shortlisted: userApplications.filter((a: Application) => a.status === "shortlisted").length,
    interviewing: userApplications.filter((a: Application) => a.status === "interviewing").length,
    offers: userApplications.filter((a: Application) => a.status === "offer").length,
    rejected: userApplications.filter((a: Application) => a.status === "rejected").length,
    accepted: userApplications.filter((a: Application) => a.status === "accepted").length,
  };

  const totalApplications = userApplications.length;
  const progress = totalApplications > 0
    ? Math.round((applicationProgress.applied / totalApplications) * 100)
    : 0;

  // Handlers
  const handleApplyClick = (job: Job) => {
    if (!userId) {
      toast.error("Please sign in to apply");
      return;
    }
    setSelectedJobForApply(job);
    setShowApplyModal(true);
  };

  const handleBookmark = async (jobId: Id<"jobs">) => {
    if (!userId) {
      toast.error("Please sign in to bookmark");
      return;
    }
    await createApplication({
      userId,
      jobId,
      status: "shortlisted",
      notes: "",
    });
    toast.success("Job bookmarked!");
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Hero Section */}
      <section className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Find Your Next Career Opportunity</h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="🔍 Search by title, company"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Input placeholder="📍 Location" />
            <Input placeholder="💰 Salary range" />
            <Button className="px-4 py-3 rounded-lg border-gray-300">
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="bg-transparent w-full outline-none"
              >
                <option value="all">Filter</option>
                <option value="all">All Jobs</option>
                <option value="MATCH">Matches</option>
                <option value="RECOMMENDED">Recommended</option>
              </select>
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-1">
        <div>
          <h2 className="text-xl font-semibold">Hi, There 👋</h2>
          <p className="text-gray-600">Here are the latest opportunities for you.</p>
        </div>

        {/* Progress Tracker */}
        <Card className='w-full max-w mt-6'>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Application Progress ({applicationProgress.applied}/{totalApplications} applied)
            </p>
            <Progress value={progress} />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Shortlisted: {applicationProgress.shortlisted}</span>
              <span>Applied: {applicationProgress.applied}</span>
              <span>Interviewing: {applicationProgress.interviewing}</span>
              <span>Offers: {applicationProgress.offers}</span>
              <span>Rejected: {applicationProgress.rejected}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-1 sm:px-5 lg:px-8 space-y-8">
        <h2 className="text-2xl font-bold mb-6">Job Matches ({filteredJobs.length})</h2>
        <div className="flex flex-col lg:flex-row gap-8 p-4">
          {/* Job Listings */}
          <div className={`${selectedJob ? 'lg:w-2/5' : 'w-full'} transition-all duration-300 overflow-y-auto max-h-[calc(100vh-20rem)]`}>
            <div className="space-y-10 p-4 lg:p-0">
              {currentJobs.length > 0 ? (
                currentJobs.map((job: Job) => (
                  <div
                    key={job._id}
                    className={`bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer ${
                      selectedJob?._id === job._id ? 'border-blue-500' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {job.logoUrl ? (
                          <img
                            src={job.logoUrl}
                            alt={job.company}
                            className="w-12 h-12 object-contain rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                            <ZapIcon className="w-4 h-4 text-blue-500" />
                          </div>
                        )}
                        <h3 className="font-semibold text-lg text-gray-900">{job.title}</h3>
                        <p className="text-gray-600 mt-1">
                          <MapPin size={12} className="inline mr-1" />
                          {job.company} • {job.location}
                        </p>
                        {job.tag && (
                          <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                            job.tag === 'MATCH'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {job.tag}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      <Clock size={12} className="inline mr-1" />
                      Posted {new Date(job.postedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
                  <p className="text-gray-500">No jobs found matching your criteria</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded border ${
                        currentPage === page
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Job Details */}
          {selectedJob && (
            <div className="lg:w-4/5 bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-y-auto max-h-[calc(100vh-20rem)]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h2>
                  <p className="text-lg text-gray-600 mt-1">{selectedJob.company} • {selectedJob.location}</p>
                  {selectedJob.tag && (
                    <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
                      selectedJob.tag === 'MATCH'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedJob.tag}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6 flex items-center text-sm text-gray-500">
                <Clock size={16} className="mr-1" />
                Posted {new Date(selectedJob.postedAt).toLocaleDateString()}
              </div>

              <div className="prose max-w-none mb-6">
                <h3 className="text-lg font-semibold mb-3">Job Description</h3>
                <div dangerouslySetInnerHTML={{ __html: selectedJob.description }} />
              </div>

              <div className="mt-4">
                <Link href={`/job/${selectedJob._id}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <Eye className="w-4 h-4" />
                    View Full Job Details
                  </Button>
                </Link>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => handleApplyClick(selectedJob)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center flex-1"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Apply Now
                </button>
                <button
                  onClick={() => handleBookmark(selectedJob._id)}
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center flex-1"
                >
                  <Bookmark className="w-5 h-5 mr-2" />
                  Save Job
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {selectedJobForApply && (
        <ApplyModal
          isOpen={showApplyModal}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedJobForApply(null);
          }}
          jobId={selectedJobForApply._id as Id<"jobs">}
          jobTitle={selectedJobForApply.title}
          companyName={selectedJobForApply.company}
          onApplySuccess={() => {
            // Refresh data or show success
          }}
        />
      )}
    </div>
  );
}