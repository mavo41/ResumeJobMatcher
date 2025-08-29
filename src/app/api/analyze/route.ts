// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Id } from "../../../../convex/_generated/dataModel";
import { normalizeFeedback } from "../../types/feedback";
import { getFileFromConvexStorage, FileContent } from "../../lib/getFileFromConvexStorage";

// The crucial change for server-side PDF.js usage with Next.js and Turbopack.
// We provide an absolute path to the worker script, ensuring it is found.
// We also wrap this in a check to ensure it only runs on the server.
if (typeof window === 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = require('path').resolve(__dirname, '../../../../../node_modules/pdfjs-dist/build/pdf.worker.min.js');
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;

/**
 * Extracts text from a PDF file using pdfjs-dist.
 * @param arrayBuffer The binary data of the PDF file as an ArrayBuffer.
 * @returns A promise that resolves with the extracted text string.
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    
    // Loop through all pages and get their text content
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Join text items with a space and add a newline at the end of each page
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
      page.cleanup(); // Clean up page resources
    }
    
    return text;
  } catch (error) {
    console.error("PDF.js extraction error:", error);
    throw new Error("Failed to extract text from PDF");
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
    } else {
      try {
        // Pass the ArrayBuffer directly to the PDF extraction function
        resumeText = await extractTextFromPDF(fileData.data);
      } catch (err: any) {
        console.error("[/api/analyze] PDF extraction failed:", err);
        return NextResponse.json({ 
          error: "Failed to extract text from PDF", 
          details: err?.message ?? String(err) 
        }, { status: 500 });
      }
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
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Analyze this resume for ${jobTitle} at ${jobTitle}. Job: ${jobDescription}. Resume: ${resumeText.substring(0, 8000)}. Return JSON.`;
        
        const result = await model.generateContent(prompt);
        feedbackText = result.response.text();
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
      console.error("Normalization error:", err);
      feedback = {
        summary: "Analysis completed",
        raw: feedbackText.substring(0, 1000)
      };
    }

    return NextResponse.json({ feedback, analyzer: analyzerUsed });

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ 
      error: "Internal server error",
      details: err?.message ?? String(err)
    }, { status: 500 });
  }
}
