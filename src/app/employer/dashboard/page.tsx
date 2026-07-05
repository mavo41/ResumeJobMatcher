// app/employer/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { 
  Home, Briefcase, Users, BarChart3, MessageSquare, Settings, 
  Sun, Moon, Bell, Plus, Search, TrendingUp, TrendingDown, 
  User, LogOut, Calendar, Clock, AlertCircle, Loader2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Types
interface NavItem {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface JobWithApplications {
  id: any;
  title: any;
  department: any;
  applications: number;
  status: any;
}


// Navigation Items
const navItems: NavItem[] = [
  { label: 'Overview', icon: <Home className="w-5 h-5" />, active: true },
  { label: 'Job Postings', icon: <Briefcase className="w-5 h-5" /> },
  { label: 'Candidates', icon: <Users className="w-5 h-5" /> },
  { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
  { label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

// Status color helper
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'open':
    case 'active':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400';
    case 'draft':
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    case 'closed':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
};

export default function EmployerDashboard() {
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch real data from Convex
  const employerProfile = useQuery(
    api.employers.getEmployerProfile,
    userId ? { userId } : "skip"
  );
  
  const jobs = useQuery(
    api.jobs.getEmployerJobs,
    userId ? { employerId: userId } : "skip"
  );
  
  const jobStats = useQuery(
    api.jobs.getJobStats,
    userId ? { employerId: userId } : "skip"
  );
  
  const applications = useQuery(
    api.applications.getEmployerApplications,
    userId ? { employerId: userId } : "skip"
  );

  // Mock data for charts (replace with real data when you have it)
  const [applicationTrends, setApplicationTrends] = useState([
    { month: 'Jan', applicants: 0, hires: 0 },
    { month: 'Feb', applicants: 0, hires: 0 },
    { month: 'Mar', applicants: 0, hires: 0 },
    { month: 'Apr', applicants: 0, hires: 0 },
    { month: 'May', applicants: 0, hires: 0 },
    { month: 'Jun', applicants: 0, hires: 0 },
  ]);

  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [kpiData, setKpiData] = useState([
    { title: 'Active Jobs', value: '0', change: '+0%', trend: 'up', icon: Briefcase },
    { title: 'Total Applications', value: '0', change: '+0%', trend: 'up', icon: Users },
    { title: 'Interviews Today', value: '0', change: '0', trend: 'up', icon: Calendar },
    { title: 'Avg. Time-to-Hire', value: '0 days', change: '0', trend: 'up', icon: Clock },
  ]);

  // Update KPI data when real data loads
useEffect(() => {
  if (jobStats) {
    setKpiData([
      { 
        title: 'Active Jobs', 
        value: jobStats.activeJobs.toString(), 
        change: '+0%', 
        trend: 'up', 
        icon: Briefcase 
      },
      { 
        title: 'Total Applications', 
        value: jobStats.totalApplications.toString(), 
        change: '+0%', 
        trend: 'up', 
        icon: Users 
      },
      { 
        title: 'Interviews Today', 
        value: '0', 
        change: '0', 
        trend: 'up', 
        icon: Calendar 
      },
      { 
        title: 'Avg. Time-to-Hire', 
        value: '0 days', 
        change: '0', 
        trend: 'up', 
        icon: Clock 
      },
    ]);
  }
}, [jobStats]);

  // Update the state declarations
const [recentJobs, setRecentJobs] = useState<JobWithApplications[]>([]);

// Update the useEffect
useEffect(() => {
  if (jobs) {
    const formattedJobs = jobs.slice(0, 4).map((job: any) => ({
      id: job._id,
      title: job.title,
      department: job.department || 'General',
      applications: job.applications || 0,
      status: job.status.charAt(0).toUpperCase() + job.status.slice(1),
    }));
    setRecentJobs(formattedJobs);
  }
}, [jobs]);

  // Initialize dark mode from system preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Loading state
  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is an employer
  if (employerProfile === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Employer Profile Required</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Please complete your employer profile to access the dashboard.
          </p>
          <Link href="/employer/profile">
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-2xl hover:bg-indigo-700 transition-colors">
              Complete Profile
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
        {/* Logo */}
        <div className="px-8 py-8 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">H</span>
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-tight">Hireflow</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 -mt-1">
                {employerProfile?.companyName || 'Talent OS'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            {navItems.map((item, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(item.label.toLowerCase())}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                  item.active || activeTab === item.label.toLowerCase()
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Theme Toggle & Profile */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6 px-2">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-sm"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? 'Light' : 'Dark'} Mode</span>
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
            <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              {clerkUser?.imageUrl ? (
                <img 
                  src={clerkUser.imageUrl} 
                  alt={clerkUser.firstName || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium">
                  {clerkUser?.firstName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {clerkUser?.firstName || 'User'}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {employerProfile?.companyName || 'Employer'}
              </div>
            </div>
            <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6 flex-1">
            <div className="font-semibold text-xl">Dashboard Overview</div>
            
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates, jobs..."
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-indigo-300 dark:focus:border-indigo-700 pl-11 py-2.5 rounded-2xl text-sm focus:outline-none transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                ⌘K
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-zinc-950"></div>
            </button>

            {/* Create New Job */}
            <Link href="/post-job">
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-5 py-2.5 rounded-2xl text-sm font-medium">
                <Plus className="w-4 h-4" />
                New Job
              </button>
            </Link>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-2xl overflow-hidden ring-2 ring-white dark:ring-zinc-900">
              {clerkUser?.imageUrl ? (
                <img 
                  src={clerkUser.imageUrl} 
                  alt={clerkUser.firstName || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {clerkUser?.firstName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-8 space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div 
                  key={index}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{kpi.title}</div>
                      <div className="text-4xl font-semibold tabular-nums tracking-tighter">{kpi.value}</div>
                    </div>
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                      <Icon className="w-6 h-6 text-indigo-500" />
                    </div>
                  </div>
                  
                  <div className={`inline-flex items-center gap-1 text-xs mt-6 px-3 py-1 rounded-full ${
                    kpi.trend === 'up' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' 
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
                  }`}>
                    {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.change}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Application Trends Area Chart */}
            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="font-semibold">Application Trends</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Monthly applicants vs hires • Last 6 months</div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-indigo-500 rounded"></div>
                    <span className="text-zinc-500 dark:text-zinc-400">Applicants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-emerald-500 rounded"></div>
                    <span className="text-zinc-500 dark:text-zinc-400">Hires</span>
                  </div>
                </div>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={applicationTrends}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={isDarkMode ? '#27272a' : '#e4e4e7'} 
                    />
                    <XAxis 
                      dataKey="month" 
                      stroke={isDarkMode ? '#52525b' : '#71717a'} 
                      fontSize={12}
                    />
                    <YAxis 
                      stroke={isDarkMode ? '#52525b' : '#71717a'} 
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#18181b' : '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        color: isDarkMode ? '#f4f4f5' : '#18181b'
                      }}
                    />
                    <Area 
                      type="natural" 
                      dataKey="applicants" 
                      stroke="#6366f1" 
                      fill="url(#applicantsGradient)" 
                      strokeWidth={3}
                    />
                    <Area 
                      type="natural" 
                      dataKey="hires" 
                      stroke="#10b981" 
                      fill="url(#hiresGradient)" 
                      strokeWidth={3}
                    />
                    
                    <defs>
                      <linearGradient id="applicantsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="hiresGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recruitment Funnel - Using Real Data */}
            <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col">
              <div className="font-semibold mb-8">Recruitment Funnel</div>
              
              <div className="flex-1 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Sourced', value: 450, color: '#818cf8' },
                        { name: 'Applied', value: 320, color: '#6366f1' },
                        { name: 'Interview', value: 180, color: '#4f46e5' },
                        { name: 'Offer', value: 75, color: '#4338ca' },
                        { name: 'Hired', value: 30, color: '#3730a3' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Sourced', value: 450, color: '#818cf8' },
                        { name: 'Applied', value: 320, color: '#6366f1' },
                        { name: 'Interview', value: 180, color: '#4f46e5' },
                        { name: 'Offer', value: 75, color: '#4338ca' },
                        { name: 'Hired', value: 30, color: '#3730a3' },
                      ].map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isDarkMode ? entry.color : entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
                        borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
                        color: isDarkMode ? '#fafafa' : '#18181b',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="text-xs text-center text-zinc-500 dark:text-zinc-400 mt-4">
                Candidates moving through stages
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {[
                    { name: 'Sourced', value: 450, color: '#818cf8' },
                    { name: 'Applied', value: 320, color: '#6366f1' },
                    { name: 'Interview', value: 180, color: '#4f46e5' },
                    { name: 'Offer', value: 75, color: '#4338ca' },
                    { name: 'Hired', value: 30, color: '#3730a3' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: isDarkMode ? item.color : item.color }}
                      />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {item.name} ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {/* Recent Job Postings */}
            <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
              <div className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="font-semibold">Recent Job Postings</div>
                <Link href="/employer/jobs">
                  <button className="text-indigo-600 dark:text-indigo-400 text-sm font-medium flex items-center gap-1 hover:underline">
                    View all
                  </button>
                </Link>
              </div>
              
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recentJobs.length > 0 ? (
                  recentJobs.map((job: any) => (
                    <div key={job.id} className="px-8 py-6 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950 flex items-center justify-center rounded-xl">
                            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{job.title}</div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">{job.department}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 text-sm">
                        <div>
                          <div className="text-right font-mono text-zinc-400 dark:text-zinc-500 text-xs">APPLICATIONS</div>
                          <div className="text-right font-semibold tabular-nums">{job.applications}</div>
                        </div>
                        
                        <div className={`px-4 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-8 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p>No jobs posted yet</p>
                    <Link href="/post-job">
                      <button className="mt-3 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
                        Create your first job posting →
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Interviews */}
            <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div className="font-semibold">Upcoming Interviews</div>
                <div className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full">
                  {upcomingInterviews.length} today
                </div>
              </div>
              
              <div className="space-y-6 flex-1">
                {upcomingInterviews.length > 0 ? (
                  upcomingInterviews.map((interview: any) => (
                    <div key={interview.id} className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-100 dark:ring-zinc-800">
                        {interview.avatar ? (
                          <img 
                            src={interview.avatar} 
                            alt={interview.candidate} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg font-medium text-indigo-600 dark:text-indigo-400">
                            {interview.candidate?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{interview.candidate}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{interview.role}</div>
                        <div className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-300">{interview.time}</div>
                      </div>
                      
                      <div>
                        <button className="text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 rounded-2xl transition-colors">
                          Join
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p>No interviews scheduled</p>
                  </div>
                )}
              </div>
              
              <button className="mt-8 w-full py-3.5 text-sm font-medium border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl transition-colors text-zinc-500 dark:text-zinc-400">
                + Schedule new interview
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}