// lib/ai/aiProvider.ts
//
// Centralized AI text-generation provider (Issue #6). Single place that
// owns: which model(s) to try, in what order, retry/backoff behavior,
// and basic in-process burst protection. Every chat/generation call site
// in the app should go through generateChatCompletion() rather than
// instantiating an SDK client directly.
//
// NOTE on embeddings: Groq does not offer an embeddings API. Semantic
// skill/role/education matching (lib/ai/SkillEmbeddings.ts) remains on
// Gemini's embedding-001 model. This is a deliberate, currently-accepted
// limitation — ScoringEngine already degrades gracefully to literal
// string matching when embeddings are unavailable (see
// SkillEmbeddings.getEmbeddingSafe's error handling), so a missing/
// quota-limited Gemini key does not break resume scoring, only makes
// skill matching less semantically fuzzy. Revisit if/when a free-tier
// embeddings-capable provider becomes available, or when billing is
// enabled.

import Groq from "groq-sdk";

export type AITaskType = "chat" | "structured_json";

interface GenerateOptions {
  taskType?: AITaskType;
  temperature?: number;
  maxRetries?: number;
}

interface GenerateResult {
  text: string;
  modelUsed: string;
}

// Ordered by preference. This is the ONE place to edit when adding,
// removing, or reprioritizing models/providers.
const MODELS_TO_TRY = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
];

const DEFAULT_MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Very small in-process burst guard. This does NOT solve cross-invocation
// rate limiting (per the lesson from Issue #5, in-memory state does not
// persist across separate serverless invocations) — it only prevents a
// single request that fires many AI calls in a tight loop (e.g.
// comparing 5 candidates) from hammering the provider faster than
// necessary. Real quota/rate-limit enforcement is the provider's job;
// this just adds a small, cheap courtesy delay between calls within one
// invocation.
let lastCallAt = 0;
const MIN_MS_BETWEEN_CALLS = 150;

async function respectMinInterval(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < MIN_MS_BETWEEN_CALLS) {
    await sleep(MIN_MS_BETWEEN_CALLS - elapsed);
  }
  lastCallAt = Date.now();
}

function isRetryableError(err: any): boolean {
  const status = err?.status || err?.response?.status;
  // 429 (rate limit) and 5xx (transient server errors) are worth
  // retrying. 400/401/404 are not — retrying a bad request or bad model
  // name just wastes time and quota.
  return status === 429 || (typeof status === "number" && status >= 500);
}

/**
 * Generate a chat/JSON completion, trying each configured model in
 * order, with retry-with-exponential-backoff on transient failures.
 * Throws only if every model AND every retry attempt is exhausted —
 * callers should still wrap this in their own try/catch for a final
 * fallback (e.g. fallbackFeedback()), since even a fully-working
 * provider integration can legitimately be down.
 */
export async function generateChatCompletion(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const { taskType = "structured_json", temperature = 0.4, maxRetries = DEFAULT_MAX_RETRIES } = options;

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const groq = new Groq({ apiKey: GROQ_KEY });
  const errors: string[] = [];

  for (const model of MODELS_TO_TRY) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await respectMinInterval();

      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          ...(taskType === "structured_json"
            ? { response_format: { type: "json_object" as const } }
            : {}),
        });

        const text = completion.choices[0]?.message?.content || "";
        if (text.trim().length > 0) {
          return { text, modelUsed: model };
        }
        errors.push(`${model} (attempt ${attempt + 1}): empty response`);
        break; // empty response isn't retryable, move to next model
      } catch (err: any) {
        const message = err?.message || String(err);
        errors.push(`${model} (attempt ${attempt + 1}): ${message}`);

        if (attempt < maxRetries && isRetryableError(err)) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        break; // not retryable, or retries exhausted — move to next model
      }
    }
  }

  throw new Error(`All models/attempts failed. Details: ${errors.join(" | ")}`);
}