//src\app\components\AtsScoreCard.tsx
import React from "react";
import { Progress } from "../../components/ui/progress";
import { Info } from "lucide-react";

// Define the props for the AtsScoreCard component
interface AtsScoreCardProps {
  score: number;
}

const AtsScoreCard: React.FC<AtsScoreCardProps> = ({ score }) => {
  // color of the progress bar and text based on the score.
  const scoreColor = score > 70
    ? "text-green-600"
    : score > 40
    ? "text-yellow-600"
    : "text-red-600";

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
        <Info className="w-6 h-6 text-blue-500" />
        ATS Score
      </h2>
      <div className="bg-white shadow rounded-xl p-6 space-y-4">
        <p className="text-gray-600 text-sm">
          An ATS (Applicant Tracking System) score estimates how well your
          resume matches the job description.
        </p>
        <Progress value={score} className="h-4" />
        <p className={`text-lg font-semibold ${scoreColor}`}>
          {score}% match
        </p>
      </div>
    </section>
  );
};

export default AtsScoreCard;
