// src/app/api/test-groq/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_KEY = process.env.GROQ_API_KEY;

const MODELS_TO_TRY = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

export async function GET() {
  if (!GROQ_KEY) {
    return NextResponse.json({
      error: "GROQ_API_KEY not configured",
      hasKey: false,
    });
  }

  const groq = new Groq({ apiKey: GROQ_KEY });
  const results = [];

  for (const model of MODELS_TO_TRY) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Say 'Hello, Groq is working!' in one sentence." }],
      });

      const message = completion.choices[0]?.message?.content || "No response";
      results.push({ model, success: true, message });
    } catch (error: any) {
      results.push({ model, success: false, error: error.message });
    }
  }

  const workingModel = results.find((r) => r.success);

  return NextResponse.json({
    success: !!workingModel,
    workingModel: workingModel?.model || null,
    results,
    hasKey: true,
  });
}