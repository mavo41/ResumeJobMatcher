"use client";
//src\app\components\ScoreGauge.tsx
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export function ScoreGauge({ value }: { value: number }) {
  return (
    <div className="w-32 h-32">
      <CircularProgressbar
        value={value}
        text={`${value}%`}
        styles={buildStyles({
          textColor: "#111",
          pathColor: value >= 80 ? "green" : value >= 50 ? "orange" : "red",
          trailColor: "#eee",
        })}
      />
    </div>
  );
}
