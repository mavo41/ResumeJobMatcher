// app/employer/components/RubricEditor.tsx
"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Lock, RotateCcw, Save } from "lucide-react";
import { toast } from "react-hot-toast";

export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  projects: number;
  certifications: number;
  achievements: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 35,
  experience: 25,
  education: 15,
  projects: 12,
  certifications: 8,
  achievements: 5,
};

const CATEGORY_LABELS: Record<keyof ScoringWeights, string> = {
  skills: "Skills Match",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
  achievements: "Achievements",
};

interface RubricEditorProps {
  /** Existing job's ID — if provided, edits are saved immediately via
   * setJobRubric. If omitted (new job not yet created), the component
   * operates in "draft" mode and reports weights back via onChange for
   * the parent form to submit alongside job creation. */
  jobId?: Id<"jobs">;
  initialWeights?: ScoringWeights;
  locked?: boolean;
  onChange?: (weights: ScoringWeights) => void;
}

export default function RubricEditor({ jobId, initialWeights, locked = false, onChange }: RubricEditorProps) {
  const [weights, setWeights] = useState<ScoringWeights>(initialWeights || DEFAULT_WEIGHTS);
  const [isSaving, setIsSaving] = useState(false);
  const setJobRubric = useMutation(api.jobs.setJobRubric);

  useEffect(() => {
    if (initialWeights) setWeights(initialWeights);
  }, [initialWeights]);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = Math.abs(total - 100) < 0.5;

  const handleChange = (key: keyof ScoringWeights, value: string) => {
    const num = Math.max(0, Math.min(100, Number(value) || 0));
    const next = { ...weights, [key]: num };
    setWeights(next);
    onChange?.(next);
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
    onChange?.(DEFAULT_WEIGHTS);
  };

  const handleSave = async () => {
    if (!jobId) return;
    if (!isValid) {
      toast.error(`Weights must sum to 100 (currently ${total}).`);
      return;
    }
    setIsSaving(true);
    try {
      await setJobRubric({ jobId, weights });
      toast.success("Scoring rubric saved and locked once first candidate is scored.");
    } catch (e: any) {
      toast.error(e.message || "Failed to save rubric");
    } finally {
      setIsSaving(false);
    }
  };

  if (locked) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-zinc-500" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
            Scoring Rubric (Locked)
          </h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          This rubric is locked because at least one candidate has already been scored against this job.
          Standardized evaluation requires identical criteria for every applicant, so it can no longer be changed.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {(Object.keys(weights) as (keyof ScoringWeights)[]).map((key) => (
            <div key={key} className="flex justify-between px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-600 dark:text-zinc-400">{CATEGORY_LABELS[key]}</span>
              <span className="font-medium">{weights[key]}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Scoring Rubric</h3>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset to default
        </button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        Set how candidates are weighted for this job. Locks automatically once your first applicant is
        scored, ensuring every candidate is judged by the same standard.
      </p>

      <div className="space-y-3">
        {(Object.keys(weights) as (keyof ScoringWeights)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <label className="w-32 text-sm text-zinc-600 dark:text-zinc-400 shrink-0">
              {CATEGORY_LABELS[key]}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="flex-1"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={weights[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-right"
            />
            <span className="text-sm text-zinc-400 w-3">%</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className={`text-sm font-medium ${isValid ? "text-emerald-600" : "text-rose-600"}`}>
          Total: {total}% {isValid ? "✓" : "(must equal 100%)"}
        </span>

        {jobId && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save Rubric"}
          </button>
        )}
      </div>
    </div>
  );
}