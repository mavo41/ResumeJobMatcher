// app/employer/candidates/components/CandidateDetailModal.tsx
"use client";

import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Brain,
  Sparkles,
  Loader2,
  Download,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Shield,
  Target,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../../../components/ui/button";
import { Candidate } from "./AI/types";

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onAIAnalysis: (candidate: Candidate, type: string) => Promise<void>;
  isAILoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  shortlisted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  interviewing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const STATUS_ICONS: Record<string, any> = {
  applied: Clock,
  reviewed: Eye,
  shortlisted: Star,
  interviewing: Calendar,
  offer: CheckCircle,
  accepted: CheckCircle,
  rejected: XCircle,
};

export default function CandidateDetailModal({
  isOpen,
  onClose,
  candidate,
  onAIAnalysis,
  isAILoading,
}: CandidateDetailModalProps) {
  if (!isOpen) return null;

  const StatusIcon = STATUS_ICONS[candidate.status] || Clock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold text-white">
              {candidate.name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                {candidate.name || "Unknown Candidate"}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {candidate.jobTitle || "No position"}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[candidate.status] || "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                  <span className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {candidate.status ? candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1) : "Unknown"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Mail className="w-4 h-4 text-zinc-400" />
              <span>{candidate.email || "No email"}</span>
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Phone className="w-4 h-4 text-zinc-400" />
                <span>{candidate.phone}</span>
              </div>
            )}
            {candidate.location && (
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <span>{candidate.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>Applied {candidate.appliedAt ? formatDistanceToNow(candidate.appliedAt, { addSuffix: true }) : "Unknown"}</span>
            </div>
          </div>

          {/* Match Score */}
          {candidate.matchScore && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Match Score</span>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {candidate.matchScore}%
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all"
                  style={{ width: `${candidate.matchScore}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Weak match</span>
                <span>Strong match</span>
              </div>
            </div>
          )}

          {/* Skills */}
          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills && candidate.skills.length > 0 ? (
                candidate.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">No skills listed</span>
              )}
            </div>
          </div>

          {/* Experience */}
          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Experience</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {candidate.experience || 0} years of professional experience
            </p>
          </div>

          {/* Notes */}
          {candidate.notes && (
            <div>
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Notes</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                {candidate.notes}
              </p>
            </div>
          )}

          {/* AI Features Section */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              AI Features
            </h3>

            {/* AI Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => onAIAnalysis(candidate, "explain_candidate")}
                disabled={isAILoading}
              >
                {isAILoading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Brain className="w-3.5 h-3.5 mr-1.5" />
                )}
                Explain
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => onAIAnalysis(candidate, "recommend_interviews")}
                disabled={isAILoading}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Questions
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => onAIAnalysis(candidate, "detect_bias")}
                disabled={isAILoading}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Bias
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => onAIAnalysis(candidate, "match_candidates")}
                disabled={isAILoading}
              >
                <Target className="w-3.5 h-3.5 mr-1.5" />
                Match
              </Button>
            </div>

            {/* AI Analysis Results Placeholder */}
            {isAILoading && (
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                <span className="text-sm text-indigo-700 dark:text-indigo-400">AI is analyzing...</span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" className="text-xs">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Message
              </Button>
              <Button size="sm" variant="ghost" className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Resume
              </Button>
              <Button size="sm" variant="ghost" className="text-xs">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Schedule Interview
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-end rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}