"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

interface CategoryBreakdown {
  score: number;
  matchedItems: string[];
  missingItems: string[];
}

interface JobMatchExplanationProps {
  resumeQualityScore: number;
  jobMatchScore: number;
  breakdown: Record<string, CategoryBreakdown>;
}

export default function JobMatchExplanation({ resumeQualityScore, jobMatchScore, breakdown }: JobMatchExplanationProps) {
  const gap = resumeQualityScore - jobMatchScore;
  const isLowMatch = jobMatchScore < 50;

  // Pull the two weakest categories' concrete missing items — this is
  // what turns "44%" into an actionable, specific explanation instead
  // of a bare number.
  const categories = Object.entries(breakdown)
    .filter(([key]) => key !== "resumeQuality")
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => a.score - b.score);

  const weakest = categories.slice(0, 2).filter((c) => c.missingItems?.length > 0);

  if (!isLowMatch && gap < 25) {
    return (
      <div className="max-w-2xl mx-auto p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-start gap-2">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>Your resume aligns well with this role's requirements — a strong candidate for this posting.</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-semibold">
            Your resume is well-written (Quality: {resumeQualityScore}%), but scores {jobMatchScore}% against
            this specific role's requirements.
          </p>
          <p className="mt-1 text-amber-700">Here's specifically why:</p>
        </div>
      </div>

      {weakest.length > 0 && (
        <ul className="space-y-2 pl-7">
          {weakest.map((cat) => (
            <li key={cat.key} className="list-disc">
              <span className="capitalize font-medium">{cat.key}</span> ({cat.score}%) — missing:{" "}
              {cat.missingItems.slice(0, 4).join(", ")}
              {cat.missingItems.length > 4 && ` +${cat.missingItems.length - 4} more`}
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row gap-2">
        <Link
          href="/jobboard"
          className="flex-1 text-center text-sm font-medium border border-amber-300 hover:bg-amber-100 text-amber-800 px-4 py-2 rounded-lg transition"
        >
          Browse other roles that may fit better
        </Link>
        <span className="flex-1 text-center text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition cursor-default">
          Review AI feedback below, then decide
        </span>
      </div>
      <p className="text-xs text-amber-600 text-center">
        This score is advisory — you're always free to apply regardless. Employers see your full application either way.
      </p>
    </div>
  );
}