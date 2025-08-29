//src\app\types\feedback.ts
import { z } from "zod";

// --- ZOD SCHEMAS ---
const tipSchema = z.object({
  type: z.enum(["good", "improve", "warning"]).default("improve"),
  tip: z.string().default(""),
  explanation: z.string().default(""),
});

const sectionSchema = z.object({
  score: z.number().min(0).max(100).default(0),
  tips: z.array(tipSchema).default([]),
});

const feedbackSchema = z.object({
  overallScore: z.number().min(0).max(100).default(0),
  ATS: sectionSchema.default({ score: 0, tips: [] }),
  toneAndStyle: sectionSchema.default({ score: 0, tips: [] }),
  content: sectionSchema.default({ score: 0, tips: [] }),
  structure: sectionSchema.default({ score: 0, tips: [] }),
  skills: sectionSchema.default({ score: 0, tips: [] }),
});

// --- DEFAULT FALLBACK ---
export const defaultFeedback = {
  overallScore: 0,
  ATS: { score: 0, tips: [] },
  toneAndStyle: { score: 0, tips: [] },
  content: { score: 0, tips: [] },
  structure: { score: 0, tips: [] },
  skills: { score: 0, tips: [] },
};

export type Feedback = z.infer<typeof feedbackSchema>;

// --- UNIFIED NORMALIZER ---
// Handles both Gemini’s new JSON schema & your old legacy format
export function normalizeFeedback(rawOrText: unknown): Feedback {
  let raw: any = rawOrText;

  // Case 0: If we got a string → parse JSON
  if (typeof rawOrText === "string") {
    try {
      raw = JSON.parse(rawOrText);
    } catch (err) {
      console.error("❌ Could not parse Gemini response:", err);
      return defaultFeedback;
    }
  }

  if (!raw || typeof raw !== "object") return defaultFeedback;

  // ✅ Case 1: Already new structured format (Gemini current output)
  if ("ATS" in raw && "overallScore" in raw) {
    try {
      return feedbackSchema.parse(raw);
    } catch (err) {
      console.warn("⚠️ Structured format failed schema validation:", err);
      return defaultFeedback;
    }
  }

  // ✅ Case 2: Old flat format (legacy)
  const legacy = raw as {
    atsScore?: number;
    keyStrengths?: string[];
    keyWeaknesses?: string[];
    keywordAnalysis?: { found: string[]; missing: string[] };
    tailoringSuggestions?: string[];
  };

  const transformed: Feedback = {
    ...defaultFeedback,
    overallScore: legacy.atsScore ?? 0,
    ATS: {
      score: legacy.atsScore ?? 0,
      tips: [
        ...(legacy.keyStrengths ?? []).map((tip) => ({
          type: "good" as const,
          tip,
          explanation: "",
        })),
        ...(legacy.keyWeaknesses ?? []).map((tip) => ({
          type: "improve" as const,
          tip,
          explanation: "",
        })),
      ],
    },
    content: {
      score: legacy.atsScore ?? 0,
      tips: (legacy.tailoringSuggestions ?? []).map((tip) => ({
        type: "improve" as const,
        tip,
        explanation: "Tailor this section for better alignment.",
      })),
    },
    skills: {
      score: legacy.atsScore ?? 0,
      tips: [
        ...(legacy.keywordAnalysis?.found ?? []).map((k) => ({
          type: "good" as const,
          tip: `Includes keyword: ${k}`,
          explanation: "Relevant keyword present.",
        })),
        ...(legacy.keywordAnalysis?.missing ?? []).map((k) => ({
          type: "improve" as const,
          tip: `Missing keyword: ${k}`,
          explanation: "Consider adding where appropriate.",
        })),
      ],
    },
  };

  try {
    return feedbackSchema.parse(transformed);
  } catch (err) {
    console.error("❌ Legacy-to-structured transform failed validation:", err);
    return defaultFeedback;
  }
}
