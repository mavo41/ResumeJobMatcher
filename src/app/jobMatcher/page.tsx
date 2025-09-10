'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';


interface Job {
  _id: string;
  _creationTime: number;
  title: string;
  company: string;
  location: string;
  postedAt: number;
  description: string;
  status: string;
  tag?: string;
  logoUrl?: string;
}

export default function JobsPage() {
  const { user } = useUser();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const jobsPerPage = 8;

  // Fetch jobs from Convex with required arguments
  const jobs = useQuery(api.jobs.getOpenJobs, { cursor: undefined, limit: 100 }) || { page: [] };

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

  // Application progress calculation (mock data - replace with real data)
  const applicationProgress = {
    applied: 12,
    shortlisted: 3,
     interviewing: 2,
    interviews: 3,
    offers: 1,
    rejected: 2
  };
  const totalApplications = applicationProgress.applied + applicationProgress.interviews + 
                           applicationProgress.offers + applicationProgress.rejected;
                             const progress = Math.round((applicationProgress.applied / (totalApplications || 1)) * 100);

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto"> {/* Entire page scrollbar */}
      {/* Hero Section */}
       <section className="bg-white shadow-sm border-b">
              <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
                <h1 className="text-2xl font-bold">Find Your Next  Career Opportunity</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input placeholder="🔍 Search by title, company" />
                  <Input placeholder="📍 Location" />
                  <Input placeholder="💰 Salary range" />            
                  {/*  border-gray-300*/}
                  <Button  className="px-4 py-3 rounded-lg text-white-800 focus:outline--700 focus:ring-6 focus:ring-blue-500 border-gray-300"><select 
                   
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                   >
                     <option className='text-white-800' value="all">Filter</option>
                     <option className='text-white-800' value="all">All Jobs</option>
                     <option className='text-white-800' value="MATCH">Matches</option>
                     <option className='text-white-800' value="RECOMMENDED">Recommended</option>
                    </select></Button>
                   
                  </div>
              </div>
        </section>
<section className="max-w-7xl mx-auto px-1 "> {/* Reduced space-y-6 to space-y-2 */}
        {/* Salutation */}
                <div>
                  <h2 className="text-xl font-semibold space-y-10">Hi, There 👋</h2>
                  <p className="text-gray-600 space-y-14">
                    Here are the latest opportunities for you.
                  </p>
                </div>
        
                {/* Progress Tracker */}
                <Card>
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
                    </div>
                  </CardContent>
                </Card>
        
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-1 sm:px-5 lg:px-8">
         <h2 className="text-2xl font-bold mb-6">Job Matches ({filteredJobs.length})</h2>
        <div className="flex flex-col lg:flex-row gap-8 p-4 "> {/* Full width container */}
          {/* Job Listings */}
         
          <div className={`${selectedJob ? 'lg:w-2/5' : 'w-full'} transition-all duration-300 overflow-y-auto max-h-[calc(100vh-20rem)]`}> {/* Left panel scrollbar */}
            
            
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
                         {/*placeeholder if no logoUrl */}
                      {job.logoUrl ? (
                        <img 
                          src={job.logoUrl} 
                          alt={job.company} 
                          className="w-12 h-12 object-contain rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                          <span className="text-gray-500 text-xs">No Logo</span>
                        </div>
                      )}
                        <h3 className="font-semibold text-lg text-gray-900">{job.title}</h3>
                        
                        <p className="text-gray-600 mt-1"><MapPin size={12}  />{job.company} • {job.location}</p>
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
                    <div className="mt-4 text-sm text-gray-500"> <Clock size={12} />
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
            <div className="lg:w-2/5 bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-y-auto max-h-[calc(100vh-20rem)]"> {/* Right panel scrollbar, same height as left */}
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 flex items-center text-sm text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Posted {new Date(selectedJob.postedAt).toLocaleDateString()}
              </div>

              <div className="prose max-w-none mb-6">
                <h3 className="text-lg font-semibold mb-3">Job Description</h3>
                <div dangerouslySetInnerHTML={{ __html: selectedJob.description }} />
              </div>

              <div className="mt-8 flex gap-4">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Apply Now
                </button>
                <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save Job
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}