// app/employer/candidates/components/AI/ExplainableScore.tsx
"use client";

import { useState } from "react";
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ExplainableScore as ExplainableScoreType } from "./types";

interface ExplainableScoreProps {
  score: ExplainableScoreType;
  candidateName: string;
  expanded?: boolean;
}

const CATEGORY_ICONS = {
  skills: "💻",
  experience: "📋",
  projects: "🚀",
  education: "🎓",
  certifications: "📜",
  softSkills: "💬",
};

export default function ExplainableScore({ score, candidateName, expanded = false }: ExplainableScoreProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  return (
    <div className="space-y-6">
      {/* Overall Score Header */}
      <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-xl">
        <div className="text-center">
          <div className="text-5xl font-bold text-indigo-600">{score.overall}%</div>
          <div className="text-sm text-zinc-500">Match Score</div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">AI Confidence</span>
            <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all" 
                style={{ width: `${score.confidence}%` }}
              />
            </div>
            <span className="text-sm font-bold">{score.confidence}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              score.risk === "LOW" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
              score.risk === "MEDIUM" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
              "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
            }`}>
              Risk: {score.risk}
            </span>
            <span className="text-xs text-zinc-500">{score.riskReason}</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Recommendation</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{score.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition"
      >
        <span>Detailed Breakdown</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {Object.entries(score.categories).map(([key, value]) => (
            <div 
              key={key} 
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS]}</span>
                  <span className="font-medium capitalize text-sm">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-600">{value.score}%</span>
                  <span className="text-xs text-zinc-400">({value.weight}% weight)</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all" 
                  style={{ width: `${value.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {value.reasoning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Confidence Indicator */}
      <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <Info className="w-4 h-4 text-zinc-400" />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Analysis based on {candidateName}'s resume and job requirements
        </span>
      </div>
    </div>
  );
}