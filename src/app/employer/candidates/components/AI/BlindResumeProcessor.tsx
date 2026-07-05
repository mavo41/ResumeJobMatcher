// app/employer/candidates/components/AI/BlindResumeProcessor.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs"; // <-- ADD THIS
import { api } from "../../../../../../convex/_generated/api";
import { Shield, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BlindResumeProcessorProps {
  candidateId: string;
  resumeText: string;
  onProcessed: (anonymized: string) => void;
}

export default function BlindResumeProcessor({ candidateId, resumeText, onProcessed }: BlindResumeProcessorProps) {
  const { userId } = useAuth(); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [anonymizedText, setAnonymizedText] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [biasDetection, setBiasDetection] = useState<{
    hasBias: boolean;
    issues: Array<{ type: string; severity: "LOW" | "MEDIUM" | "HIGH"; suggestion: string }>;
    score: number;
  } | null>(null);

  const processResume = useMutation(api.ai.processResumeBlind);

 const handleProcess = async () => {
    if (!userId) {
      toast.error("Please sign in to process resumes");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processResume({
        resumeText,
        candidateId,
        employerId: userId, // <-- ADD employerId
      });

      setAnonymizedText(result.anonymized);
      setBiasDetection({
        hasBias: result.biasIssues.length > 0,
        issues: result.biasIssues || [],
        score: result.biasScore || 0,
      });
      
      onProcessed(result.anonymized);
      toast.success("Resume anonymized successfully!");
    } catch (error) {
      toast.error("Failed to process resume");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <CardTitle className="text-lg">Blind Resume Processing</CardTitle>
        </div>
        <CardDescription>
          Automatically removes bias by anonymizing personal information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!anonymizedText ? (
          <Button onClick={handleProcess} disabled={isProcessing} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Anonymize Resume
              </>
            )}
          </Button>
        ) : (
          <>
            {/* Bias Score */}
            {biasDetection && (
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bias Score</span>
                  <span className={`text-sm font-bold ${
                    biasDetection.score < 20 ? "text-emerald-600" :
                    biasDetection.score < 50 ? "text-amber-600" :
                    "text-rose-600"
                  }`}>
                    {biasDetection.score}% Detected
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      biasDetection.score < 20 ? "bg-emerald-500" :
                      biasDetection.score < 50 ? "bg-amber-500" :
                      "bg-rose-500"
                    }`}
                    style={{ width: `${biasDetection.score}%` }}
                  />
                </div>
                
                {/* Issues */}
                {biasDetection.issues.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {biasDetection.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className={`w-4 h-4 mt-0.5 ${
                          issue.severity === "HIGH" ? "text-rose-500" :
                          issue.severity === "MEDIUM" ? "text-amber-500" :
                          "text-emerald-500"
                        }`} />
                        <div>
                          <span className="font-medium">{issue.type}</span>
                          <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                            {issue.suggestion}
                          </span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            issue.severity === "HIGH" ? "bg-rose-100 text-rose-700" :
                            issue.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-100 text-emerald-700"
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resume Preview */}
            <div className="space-y-2">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              >
                {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showOriginal ? "Show Anonymized" : "Show Original"}
              </button>
              <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 max-h-48 overflow-y-auto text-sm font-mono whitespace-pre-wrap">
                {showOriginal ? resumeText : anonymizedText}
              </div>
            </div>

            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Resume anonymized and bias-free</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}