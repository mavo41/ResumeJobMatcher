// app/employer/candidates/components/AI/AIInsightsWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  Clock, 
  AlertCircle,
  Star,
  Award,
  Zap,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/Skeleton";

interface AIInsightsWidgetProps {
  userId: string;
  jobId?: string;
  onAction: (action: string, data?: any) => void;
}

export default function AIInsightsWidget({ userId, jobId, onAction }: AIInsightsWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const insights = useQuery(api.ai.getHiringInsights, { 
    userId, 
    jobId: jobId as any 
  });

  // Generate insights if none exist
  const generateInsights = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerId: userId,
          jobId: jobId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate insights");
      
      const data = await response.json();
      toast.success("Insights generated!");
      // The query will automatically refetch
    } catch (error) {
      console.error("Insights Generation Error:", error);
      toast.error("Failed to generate insights");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!insights) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">👋 No insights yet</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Generate AI-powered hiring insights from your candidate data
              </p>
            </div>
            <Button onClick={generateInsights} disabled={isRefreshing}>
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Generate Insights
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Access nested properties correctly
  const metrics = insights.metrics || {};
  const topCandidates = insights.topCandidates || [];
  const skillGaps = insights.skillGaps || [];
  const recommendations = insights.recommendations || [];

  return (
    <div className="space-y-4">
      {/* Welcome Message */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">👋 Morning, here are today's hiring insights</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={generateInsights}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Zap className="w-8 h-8 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition cursor-pointer"
             onClick={() => onAction("view_applicants")}>
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-indigo-500" />
            <span className="text-2xl font-bold">{metrics.totalApplicants || 0}</span>
          </div>
          <p className="text-sm text-zinc-500">Total Applicants</p>
          {insights.trends?.applications && (
            <p className="text-xs text-emerald-500 mt-1">
              +{insights.trends.applications.slice(-3).reduce((a, b) => a + b.count, 0)} this week
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition cursor-pointer"
             onClick={() => onAction("view_top")}>
          <div className="flex items-center justify-between">
            <Star className="w-5 h-5 text-amber-500" />
            <span className="text-2xl font-bold">{metrics.topMatch || 0}%</span>
          </div>
          <p className="text-sm text-zinc-500">Top Match</p>
          <p className="text-xs text-emerald-500 mt-1">Interview immediately</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition cursor-pointer"
             onClick={() => onAction("view_interviews")}>
          <div className="flex items-center justify-between">
            <Clock className="w-5 h-5 text-emerald-500" />
            <span className="text-2xl font-bold">{metrics.interviewReady || 0}</span>
          </div>
          <p className="text-sm text-zinc-500">Interview Ready</p>
          <p className="text-xs text-emerald-500 mt-1">Top candidates</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition cursor-pointer"
             onClick={() => onAction("view_gaps")}>
          <div className="flex items-center justify-between">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <span className="text-2xl font-bold">{skillGaps.length || 0}</span>
          </div>
          <p className="text-sm text-zinc-500">Missing Skills</p>
          <p className="text-xs text-rose-500 mt-1">Action needed</p>
        </div>
      </div>

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">🎯 Most Missing Skills</h4>
            <Button variant="ghost" size="sm" onClick={() => onAction("view_gaps")}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {skillGaps.slice(0, 3).map((gap, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="font-medium w-24 text-sm">{gap.skill}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      gap.percentage > 60 ? "bg-rose-500" :
                      gap.percentage > 30 ? "bg-amber-500" :
                      "bg-emerald-500"
                    }`}
                    style={{ width: `${gap.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{gap.percentage}%</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              💡 Recommendation: {recommendations[0] || "Consider adjusting job requirements to attract more qualified candidates."}
            </p>
          </div>
        </div>
      )}

      {/* Top Candidates */}
      {topCandidates.length > 0 && (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">🏆 Top Candidates for Immediate Interview</h4>
            <Button variant="ghost" size="sm" onClick={() => onAction("view_top")}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {topCandidates.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-indigo-600 w-6">#{i + 1}</span>
                  <span className="font-medium">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.matchScore >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {c.matchScore}%
                  </span>
                </div>
                <span className="text-xs text-zinc-500">{c.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onAction("compare")}>
          Compare Top Candidates
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAction("interview")}>
          Generate Interview Questions
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAction("analyze")}>
          Deep Dive Analysis
        </Button>
      </div>
    </div>
  );
}