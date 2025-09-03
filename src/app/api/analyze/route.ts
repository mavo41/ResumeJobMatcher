// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Id } from "../../../../convex/_generated/dataModel";
import { normalizeFeedback } from "../../types/feedback";
import { getFileFromConvexStorage, FileContent } from "../../lib/getFileFromConvexStorage";


const GEMINI_KEY = process.env.GEMINI_API_KEY;

/**
 * Safely extract text from PDF using pdf-parse.
 * @param data The binary data of the PDF file as an ArrayBuffer or Buffer.
 * @returns A promise that resolves with the extracted text string.
 */
async function extractTextFromPDF(data: ArrayBuffer | Buffer | Uint8Array): 
Promise<string> {
  try {
    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data instanceof ArrayBuffer) {
      buffer = Buffer.from(data);
    } else if (data instanceof Uint8Array) {
      buffer = Buffer.from(data.buffer);
    } else {
      throw new Error("Invalid PDF data type");
    }

    const parsed = await pdf(buffer);
    return parsed.text || "";
  } catch (error: any) {
    console.error("PDF parsing error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[/api/analyze] Request received");

    const body = await request.json().catch(() => ({}));
    const { fileStorageId, jobTitle = "", jobDescription = "" } = body ?? {};

    if (!fileStorageId) {
      return NextResponse.json({ error: "Missing fileStorageId" }, { status: 400 });
    }

    // 1) Get file from Convex storage
    let fileData: FileContent;
    try {
      fileData = await getFileFromConvexStorage(fileStorageId as Id<"_storage">);
      console.log("[/api/analyze] File fetched from Convex");
    } catch (err: any) {
      console.error("[/api/analyze] getFileFromConvexStorage failed:", err);
      return NextResponse.json({ 
        error: `Failed to fetch file: ${err?.message ?? String(err)}` 
      }, { status: 500 });
    }

    // 2) Extract text
    let resumeText = "";
    if (fileData.type === "text") {
      resumeText = fileData.data;
    } else if (fileData.type === "arrayBuffer") {
      try {
        // Pass the ArrayBuffer directly to the PDF extraction function
        resumeText = await extractTextFromPDF(fileData.data);
        console.log("[/api/analyze] PDF text extracted successfully.");
      } catch (err: any) {
        console.error("[/api/analyze] PDF extraction failed:", err);
        return NextResponse.json({ 
          error: "Failed to extract text from PDF", 
          details: err?.message ?? String(err) 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text too short. Please upload a text-based PDF.", needsFallback: true },
        { status: 400 }
      );
    }

    // 3) Call Gemini or use fallback
    let feedbackText = "";
    let analyzerUsed = "gemini-pro";

    if (!GEMINI_KEY) {      
      console.warn("Gemini API key not configured");
      analyzerUsed = "fallback";
      feedbackText = JSON.stringify({
        summary: "Please configure GEMINI_API_KEY environment variable",
        skills: ["Configuration needed"],
        suggestions: ["Set up your Gemini API key"]
      });
    } else {
      try {
        console.log("[/api/analyze] Calling Gemini API...");
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Analyze this resume for ${jobTitle} at ${jobTitle}. Job: ${jobDescription}. Resume: ${resumeText.substring(0, 8000)}. Return JSON.`;
        const result = await model.generateContent(prompt);
        feedbackText = result.response.text();
        console.log("[/api/analyze] Gemini analysis successful.");
      } catch (err: any) {
        console.error("Gemini error:", err);
        analyzerUsed = "fallback";
        feedbackText = JSON.stringify({
          summary: "Analysis completed with fallback",
          note: "Gemini API unavailable"
        });
      }
    }

    // 4) Normalize feedback
    let feedback;
    try {
      feedback = normalizeFeedback(feedbackText);
    } catch (err: any) {
      console.error("Feedback normalization error:", err);
      feedback = {
        summary: "Analysis completed, but feedback format is unexpected.",
        raw: feedbackText.substring(0, 1000)
      };
    }
    console.log("[/api/analyze] Analysis complete, sending response.");
    return NextResponse.json({ feedback, analyzer: analyzerUsed });

  } catch (err: any) {
    console.error("Unexpected error in /api/analyze:", err);
    return NextResponse.json({ 
      error: "Internal server error",
      details: err?.message ?? String(err)
    }, { status: 500 });
  }
}
