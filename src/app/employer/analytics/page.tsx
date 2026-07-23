// app/employer/analytics/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "../../components/ui/Skeleton";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";


const COLORS = ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981", "#059669", "#ef4444"];

export default function AnalyticsPage() {
  const { userId } = useAuth();
  const [timeRange, setTimeRange] = useState("6m");

  const jobs = useQuery(api.jobs.getEmployerJobs, userId ? { employerId: userId } : "skip");
  const applications = useQuery(
    api.applications.getEmployerApplications,
    userId ? { employerId: userId } : "skip"
  );

  const jobIds = jobs?.map((j: any) => j._id) ?? [];
  const viewCounts = useQuery(
    api.jobs.getJobViewCounts,
    jobIds.length > 0 ? { jobIds } : "skip"
  );

    if (jobs === undefined || applications === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-80 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

   const totalViews = viewCounts ? Object.values(viewCounts).reduce((a: number, b: any) => a + b, 0) : 0;
  const totalApplications = applications.length;
  const interviewingCount = applications.filter((a: any) => a.status === "interviewing").length;
  const hiredCount = applications.filter((a: any) => a.status === "accepted").length;

  const metricData = [
    { name: "Views", value: totalViews, icon: Eye },
    { name: "Applications", value: totalApplications, icon: Users },
    { name: "Interviews", value: interviewingCount, icon: Calendar },
    { name: "Hires", value: hiredCount, icon: CheckCircle },
  ];

  // Monthly breakdown derived from real application timestamps
  const monthlyMap = new Map<string, { applications: number; hires: number }>();
  applications.forEach((app: any) => {
    const d = new Date(app.savedAt);
    const key = d.toLocaleString("en-US", { month: "short" });
    if (!monthlyMap.has(key)) monthlyMap.set(key, { applications: 0, hires: 0 });
    const entry = monthlyMap.get(key)!;
    entry.applications++;
    if (app.status === "accepted") entry.hires++;
  });
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v }));

  // Per-job performance derived from real applications + view counts
  const jobPerformance = (jobs || []).map((job: any) => {
     const jobApps = applications.filter((a: any) => a.jobId === job._id);
    const hiredApps = jobApps.filter((a: any) => a.hiredAt);
    const avgDays = hiredApps.length > 0
    ? Math.round(hiredApps.reduce((sum: number, a: any) => sum + (a.hiredAt - a.savedAt) / 86400000, 0) / hiredApps.length)
      : null;
    return {
      name: job.title,
      applicants: jobApps.length,
      views: viewCounts?.[job._id] ?? 0,
      hires: jobApps.filter((a: any) => a.status === "accepted").length,
      avgDays,
    };
  });

  const STATUS_LABELS: Record<string, string> = {
    applied: "Applied", reviewed: "Reviewed", interviewing: "Interviewing",
    offer: "Offer", accepted: "Hired", rejected: "Rejected",
  };
  const STATUS_COLOR_MAP: Record<string, string> = {
    applied: "#6366f1", reviewed: "#8b5cf6", interviewing: "#f59e0b",
    offer: "#10b981", accepted: "#059669", rejected: "#ef4444",
  };
  const statusCounts: Record<string, number> = {};
  applications.forEach((a: any) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  const statusDistribution = Object.entries(statusCounts).map(([status, value]) => ({
    name: STATUS_LABELS[status] || status,
    value,
    color: STATUS_COLOR_MAP[status] || "#94a3b8",
  }));


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Track your hiring performance and metrics
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="1m">Last Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricData.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{metric.name}</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                    {metric.value.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                  <Icon className="h-5 w-5 text-indigo-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
               <span className="text-sm text-zinc-500 dark:text-zinc-400">
                 {jobs?.length || 0} active job{jobs?.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">Hiring Overview</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly metrics breakdown</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-zinc-600 dark:text-zinc-400">Applications</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-600 dark:text-zinc-400">Hires</span>
              </div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.5} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e4e4e7",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hires" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Candidate Status</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Distribution by stage</p>
          </div>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {statusDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-zinc-600 dark:text-zinc-400">{item.name}</span>
                <span className="ml-auto font-medium text-zinc-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Job Performance Table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-white">Job Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Job Title</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Views</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Applicants</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Conversion Rate</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Hires</th>
                <th className="px-6 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Time-to-Hire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {jobPerformance.map((job, index) => {
                const rate = Math.round((job.hires / job.applicants) * 100);
                return (
                  <tr
                    key={index}
                    className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-6 py-3.5 font-medium text-zinc-900 dark:text-white">
                      {job.name}
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {job.views}
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {job.applicants}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {job.hires}
                    </td>
                    <td className="px-6 py-3.5 text-right text-zinc-600 dark:text-zinc-400">
                      {job.avgDays !== null ? `${job.avgDays} days` : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}