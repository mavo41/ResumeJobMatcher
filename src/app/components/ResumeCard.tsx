//src\app\components\ResumeCard.tsx
import Link from "next/link";
import Image from "next/image";
import React from "react";
import ScoreCircle from "./ScoreCircle";

const ResumeCard = ({
  resume: { id, companyName, jobTitle, feedback, imagePath }
}: { resume: Resume }) => {
  return (
    <Link
      href={`/resume/${id}`}
      className="resume-card animate-in fade-in duration-1000 block"
    >
      {/* Header */}
      <div className="resume-card-header flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-black font-bold break-words">{companyName}</h2>
          <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>
        </div>
        <div className="flex-shrink-0">
          <ScoreCircle score={feedback.overallScore} />
        </div>
      </div>

      {/* Image */}
      <div className="gradient-border animate-in fade-in duration-1000 overflow-hidden rounded-lg">
        <Image
          src={imagePath}
          alt={`${companyName} Resume`}
          width={500} // can adjust
          height={350} // can adjust
          className="object-cover object-top w-full h-[350px] max-sm:h-[200px]"
        />
      </div>
    </Link>
  );
};

export default ResumeCard;
