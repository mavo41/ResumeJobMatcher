// convex/lib/feedbackSchema.ts

import { z } from "zod";

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

export type Feedback = z.infer<typeof feedbackSchema>;

export const defaultFeedback: Feedback = {
  overallScore: 0,
  ATS: { score: 0, tips: [] },
  toneAndStyle: { score: 0, tips: [] },
  content: { score: 0, tips: [] },
  structure: { score: 0, tips: [] },
  skills: { score: 0, tips: [] },
};

export function fallbackFeedback(reason: string): Feedback {
  return {
    ...defaultFeedback,
    ATS: {
      score: 0,
      tips: [{ type: "warning", tip: "AI analysis could not be completed.", explanation: reason }],
    },
  };
}

export function cleanLLMResponse(text: string): string {
  return text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
}

export function isValidFeedbackShape(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && ("ATS" in parsed || "overallScore" in parsed);
  } catch {
    return false;
  }
}

/**
 * Parses and validates raw LLM output (or a legacy flat-format object)
 * into a well-formed Feedback object. Never throws — always returns a
 * valid Feedback, falling back to defaultFeedback/fallbackFeedback on
 * any parse or validation failure.
 */
export function normalizeFeedback(rawOrText: unknown): Feedback {
  let raw: any = rawOrText;

  if (typeof rawOrText === "string") {
    try {
      raw = JSON.parse(cleanLLMResponse(rawOrText));
    } catch {
      return fallbackFeedback("AI response could not be parsed as JSON.");
    }
  }

  if (!raw || typeof raw !== "object") {
    return fallbackFeedback("AI response was not a valid object.");
  }

  // Current structured format
  if ("ATS" in raw && "overallScore" in raw) {
    const result = feedbackSchema.safeParse(raw);
    if (result.success) return result.data;
    return fallbackFeedback("AI response did not match the expected feedback schema.");
  }

  // Legacy flat format
  const legacy = raw as {
    atsScore?: number;
    keyStrengths?: string[];
    keyWeaknesses?: string[];
    keywordAnalysis?: { found: string[]; missing: string[] };
    tailoringSuggestions?: string[];
  };

  const transformed = {
    overallScore: legacy.atsScore ?? 0,
    ATS: {
      score: legacy.atsScore ?? 0,
      tips: [
        ...(legacy.keyStrengths ?? []).map((tip) => ({ type: "good" as const, tip, explanation: "" })),
        ...(legacy.keyWeaknesses ?? []).map((tip) => ({ type: "improve" as const, tip, explanation: "" })),
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
    structure: { score: legacy.atsScore ?? 0, tips: [] },
    toneAndStyle: { score: legacy.atsScore ?? 0, tips: [] },
  };

  const result = feedbackSchema.safeParse(transformed);
  return result.success ? result.data : fallbackFeedback("Legacy feedback format could not be normalized.");
}