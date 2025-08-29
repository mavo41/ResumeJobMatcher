"use client";
//src\app\components\ScoreBadge.tsx
interface ScoreBadgeProps {
  score?: number; // now optional
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const displayScore = score ?? 0; // default to 0 if undefined

  // color logic based on score
  let bgColor = "bg-gray-300 text-gray-800";
  if (displayScore >= 80) bgColor = "bg-green-200 text-green-800";
  else if (displayScore >= 50) bgColor = "bg-yellow-200 text-yellow-800";
  else bgColor = "bg-red-200 text-red-800";

  return (
    <span
      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor}`}
    >
      {displayScore}%
    </span>
  );
}
