// src/app/api/test-gemini/route.ts
import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Try multiple models until one works
const MODELS_TO_TRY = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

export async function GET() {
  if (!GEMINI_KEY) {
    return NextResponse.json({
      error: "GEMINI_API_KEY not configured",
      hasKey: false,
    });
  }

  const results = [];

  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`Testing model: ${model}...`);
      
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: "Say 'Hello, Gemini is working!' in one sentence." }],
            },
          ],
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const message = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
        results.push({ model, success: true, message });
        console.log(`✅ Model ${model} working!`);
      } else {
        const error = data.error?.message || "Unknown error";
        results.push({ model, success: false, error });
        console.log(`❌ Model ${model} failed: ${error}`);
      }
    } catch (error: any) {
      results.push({ model, success: false, error: error.message });
      console.log(`❌ Model ${model} error: ${error.message}`);
    }
  }

  const workingModel = results.find(r => r.success);

  return NextResponse.json({
    success: !!workingModel,
    workingModel: workingModel?.model || null,
    results,
    hasKey: true,
  });
}