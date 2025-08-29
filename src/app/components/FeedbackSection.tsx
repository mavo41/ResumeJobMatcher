"use client";
//src\app\components\FeedbackSection.tsx
import { ScoreBadge } from "./ScoreBadge";

interface FeedbackSectionProps {
  title: string;
  score?: number;
  tips: { message: string; type: "good" | "warning" }[];
}

export function FeedbackSection({ title, score, tips }: FeedbackSectionProps) {
  return (
    <div className="bg-white shadow rounded-xl p-6 space-y-3">
      <h3 className="text-lg font-semibold flex items-center">
        {title}
        <ScoreBadge score={score} />
      </h3>

      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li
            key={i}
            className={`text-sm ${
              tip.type === "good" ? "text-green-700" : "text-yellow-700"
            }`}
          >
            {tip.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
