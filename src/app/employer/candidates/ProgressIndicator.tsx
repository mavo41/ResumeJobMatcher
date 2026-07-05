"use client";

import React from "react";
import { Check } from "lucide-react";

export interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  showLabels?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressIndicator({
  steps,
  currentStep,
  onStepClick,
  showLabels = true,
  showPercentage = true,
  className = "",
}: ProgressIndicatorProps) {
  const percentage =
    steps.length <= 1
      ? 100
      : Math.round((currentStep / (steps.length - 1)) * 100);

  return (
    <div className={`w-full ${className}`}>

      {showPercentage && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Progress
          </span>
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            {percentage}%
          </span>
        </div>
      )}
      {/* Progress Bar */}
      <div
        className="relative mb-8 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700"
        aria-hidden="true"
      >
        <div
          className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
      {/* Steps */}
      <div
        className="flex items-start justify-between"
        role="list"
        aria-label="Progress"
      >
        {steps.map((step, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          return (
            <div
              key={step}
              role="listitem"
              className="flex flex-1 flex-col items-center"
            >
              <button
                type="button"
                disabled={!onStepClick}
                onClick={() => onStepClick?.(index)}
                aria-current={active ? "step" : undefined}
                className={`
                  relative
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  transition-all
                  duration-300

                  ${
                    completed
                      ? "border-green-600 bg-green-600 text-white"
                      : active
                      ? "border-indigo-600 bg-indigo-600 text-white scale-110 shadow-lg"
                      : "border-zinc-300 bg-white text-zinc-500 hover:border-indigo-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                  }

                  ${
                    onStepClick
                      ? "cursor-pointer"
                      : "cursor-default"
                  }
                `}
              >
                {completed ? (
                  <Check size={20} />
                ) : (
                  <span className="font-semibold">
                    {index + 1}
                  </span>
                )}
              </button>
              {showLabels && (
                <div className="mt-3 text-center">
                  <p
                    className={`
                      text-sm
                      font-medium
                      transition-colors
                      ${
                        active
                          ? "text-indigo-600 dark:text-indigo-400"
                          : completed
                          ? "text-green-600 dark:text-green-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }
                    `}
                  >
                    {step}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}