// app/employer/candidates/components/AI/CandidateComparison.tsx
"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Users, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Candidate, ComparisonResult } from "./types";

interface CandidateComparisonProps {
  candidates: Candidate[];
  userId: string;
  jobId?: string;
}

export default function CandidateComparison({ candidates, userId, jobId }: CandidateComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleSelect = (candidateId: string) => {
    setSelectedIds(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : prev.length < 5 ? [...prev, candidateId] : prev
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast.error("Select at least 2 candidates to compare");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: selectedIds,
          jobId: jobId,
          employerId: userId,
        }),
      });

      if (!response.ok) throw new Error("Comparison failed");

      const data = await response.json();
      setComparisonResult({
        rankings: data.rankings,
        insights: data.insights,
      });
      
      toast.success("Comparison complete!");
    } catch (error) {
      console.error("Comparison Error:", error);
      toast.error("Failed to compare candidates");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <div className="space-y-6">
      {/* Selection */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <span className="font-medium">Select Candidates:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {candidates.map((c) => (
            <button
              key={c._id}
              onClick={() => handleToggleSelect(c._id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                selectedIds.includes(c._id)
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {c.name}
              {selectedIds.includes(c._id) && (
                <span className="ml-1">✓</span>
              )}
            </button>
          ))}
        </div>
        <Button 
          onClick={handleCompare} 
          disabled={isLoading || selectedIds.length < 2}
          className="ml-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              Compare
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Rankings */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h4 className="font-semibold mb-4">📊 Overall Rankings</h4>
            <div className="space-y-3">
              {comparisonResult.rankings.map((c, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="font-bold text-lg text-indigo-600 w-8">#{i + 1}</span>
                  <span className="font-medium w-32 truncate">{c.name}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all" 
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                  </div>
                  <span className={`font-bold w-12 text-right ${getScoreColor(c.score)}`}>
                    {c.score}%
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.recommendation.includes("Strong") ? "bg-emerald-100 text-emerald-700" :
                    c.recommendation.includes("Good") ? "bg-blue-100 text-blue-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {c.recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Radar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <h4 className="font-semibold mb-4">Skills Radar</h4>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={comparisonResult.rankings.map(c => ({
                  skill: "Skills",
                  [c.name]: c.score,
                }))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  {comparisonResult.rankings.map((c, i) => (
                    <Radar
                      key={i}
                      name={c.name}
                      dataKey={c.name}
                      stroke={c.color}
                      fill={c.color}
                      fillOpacity={0.3}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Insights */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <h4 className="font-semibold mb-4">💡 Insights</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Top Skill: <strong>{comparisonResult.insights.topSkill}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <span>Missing Skill: <strong>{comparisonResult.insights.missingSkill}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Average Score: <strong>{comparisonResult.insights.averageScore}%</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Total Candidates: <strong>{comparisonResult.insights.totalCandidates}</strong></span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                <p className="text-sm text-indigo-700 dark:text-indigo-400">
                  💡 Recommendation: Prioritize candidates #{comparisonResult.rankings.slice(0, 3).map(r => 
                    comparisonResult.rankings.indexOf(r) + 1
                  ).join(", ")} for interviews
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}