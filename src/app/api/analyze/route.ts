// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Id } from "../../../../convex/_generated/dataModel";
import { normalizeFeedback, defaultFeedback } from "../../types/feedback";
import { getFileFromConvexStorage, FileContent } from "../../lib/getFileFromConvexStorage";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

/**
 * Safely extract text from PDF using pdf-parse.
 */
async function extractTextFromPDF(data: ArrayBuffer | Buffer | Uint8Array): Promise<string> {
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

/**
 * Validate that we have a valid Gemini response
 */
function isValidGeminiResponse(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    // Check if it has the expected structure
    return parsed && typeof parsed === 'object' && ('ATS' in parsed || 'overallScore' in parsed);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log("[/api/analyze] Starting analysis request");
  
  try {
    // 1. Parse request body
    const body = await request.json().catch(() => ({}));
     const { 
      fileStorageId, 
      jobTitle = "", 
      jobDescription = "",
      resumeId,  // NEW: resumeId from the frontend
      userId,    // NEW: userId for validation
    } = body ?? {};

    console.log("[/api/analyze] Request data:", { 
      fileStorageId, 
      jobTitle, 
      resumeId,
      userId,
      jobDescription: jobDescription.substring(0, 50) + "..." 
    });

    // 2. Validate required fields
    if (!fileStorageId) {
      return NextResponse.json(
        { error: "Missing fileStorageId" },
        { status: 400 }
      );
    }

    if (!resumeId) {
      return NextResponse.json(
        { error: "Missing resumeId" },
        { status: 400 }
      );
    }

    // 3. Get file from Convex storage with better error handling
    let fileData: FileContent;
        try {
          console.log("[/api/analyze] Fetching file from Convex storage...");
          fileData = await getFileFromConvexStorage(fileStorageId as Id<"_storage">);
        } catch (err: any) {
          console.error("[/api/analyze] getFileFromConvexStorage failed:", err);
          return NextResponse.json({
            error: "Failed to fetch file from storage",
            details: err?.message || "Unknown storage error",
          }, { status: 500 });
        }
    
        // 4. Extract text from file
        let resumeText = "";
        try {
          if (fileData.type === "text") {
            resumeText = fileData.data;
          } else if (fileData.type === "arrayBuffer") {
            resumeText = await extractTextFromPDF(fileData.data);
          } else {
            return NextResponse.json(
              { error: "Unsupported file type" },
              { status: 400 }
            );
          }
        } catch (err: any) {
          console.error("[/api/analyze] Text extraction failed:", err);
          return NextResponse.json({
            error: "Failed to extract text from file",
            details: err?.message || "Text extraction error",
          }, { status: 500 });
        }
    
        // 5. Validate extracted text
        if (!resumeText || resumeText.trim().length < 50) {
          return NextResponse.json({
            error: "Resume text too short. Please upload a text-based PDF.",
            needsFallback: true,
          }, { status: 400 });
        }
    
        // 6. Call Gemini or use fallback
        let feedbackText = "";
        let analyzerUsed = "gemini-pro";
    
    if (!GEMINI_KEY) {
      console.warn("[/api/analyze] Gemini API key not configured, using fallback");
      analyzerUsed = "fallback";
      feedbackText = JSON.stringify({
        overallScore: 65,
        ATS: {
          score: 65,
          tips: [
            { type: "improve", tip: "Gemini API key not configured. Using fallback analysis." },
            { type: "improve", tip: "Please set GEMINI_API_KEY in environment variables." }
          ]
        },
        content: {
          score: 60,
          tips: [
            { type: "good", tip: "Your resume contains relevant keywords." },
            { type: "improve", tip: "Consider adding more quantifiable achievements." }
          ]
        },
        skills: {
          score: 70,
          tips: [
            { type: "good", tip: "Technical skills are well represented." },
            { type: "improve", tip: "Add more soft skills to round out your profile." }
          ]
        },
        structure: {
          score: 65,
          tips: [
            { type: "improve", tip: "Consider using a cleaner format for better readability." }
          ]
        },
        toneAndStyle: {
          score: 60,
          tips: [
            { type: "improve", tip: "Use more action verbs to describe your achievements." }
          ]
        }
      });
    } else {
      try {
        console.log("[/api/analyze] Calling Gemini API...");
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Analyze this resume for the position of ${jobTitle}. 
        Job Description: ${jobDescription || "Not provided"}.
        Resume: ${resumeText.substring(0, 8000)}.
        
        Return a JSON object with the following structure:
        {
          "overallScore": number (0-100),
          "ATS": { "score": number (0-100), "tips": [ { "type": "good" | "improve" | "warning", "tip": string } ] },
          "content": { "score": number (0-100), "tips": [ { "type": "good" | "improve" | "warning", "tip": string } ] },
          "skills": { "score": number (0-100), "tips": [ { "type": "good" | "improve" | "warning", "tip": string } ] },
          "structure": { "score": number (0-100), "tips": [ { "type": "good" | "improve" | "warning", "tip": string } ] },
          "toneAndStyle": { "score": number (0-100), "tips": [ { "type": "good" | "improve" | "warning", "tip": string } ] }
        }
        
        Provide specific, actionable feedback based on the resume content.`;
        
        const result = await model.generateContent(prompt);
        feedbackText = result.response.text();
        console.log("[/api/analyze] Gemini analysis successful.");
        
        // Validate Gemini response
        if (!isValidGeminiResponse(feedbackText)) {
          console.warn("[/api/analyze] Gemini response not valid JSON, using fallback");
          analyzerUsed = "fallback";
          feedbackText = JSON.stringify({
            overallScore: 70,
            ATS: { score: 70, tips: [{ type: "good", tip: "Gemini analysis completed but format was unexpected. Using fallback." }] },
            content: { score: 70, tips: [] },
            skills: { score: 70, tips: [] },
            structure: { score: 70, tips: [] },
            toneAndStyle: { score: 70, tips: [] }
          });
        }
      } catch (err: any) {
        console.error("[/api/analyze] Gemini error:", err);
        analyzerUsed = "fallback";
        feedbackText = JSON.stringify({
          overallScore: 60,
          ATS: { 
            score: 60, 
            tips: [{ 
              type: "warning", 
              tip: `Gemini API error: ${err?.message || "Unknown error"}. Using fallback analysis.` 
            }] 
          },
          content: { score: 60, tips: [] },
          skills: { score: 60, tips: [] },
          structure: { score: 60, tips: [] },
          toneAndStyle: { score: 60, tips: [] }
        });
      }
    }

    // 7. Normalize feedback
    let feedback;
    try {
      feedback = normalizeFeedback(feedbackText);
      console.log("[/api/analyze] Feedback normalized successfully");
    } catch (err: any) {
      console.error("[/api/analyze] Feedback normalization error:", err);
      // Use default feedback as fallback
      feedback = {
        ...defaultFeedback,
        overallScore: 50,
        ATS: {
          score: 50,
          tips: [
            { type: "warning", tip: "Analysis completed but feedback format was unexpected. Please try again." }
          ]
        }
      };
    }
    
     // 8. NEW: Update the resume with feedback
        try {
          console.log("[/api/analyze] Updating resume feedback for:", resumeId);
          await fetchMutation(api.resumes.updateResumeFeedback, {
            id: resumeId as Id<"resumes">,
            feedback: feedback,
          });
          console.log("[/api/analyze] Resume feedback updated successfully");
        } catch (err: any) {
          console.error("[/api/analyze] Failed to update resume feedback:", err);
          // Don't fail the request - just log the error
        }
    
    // 8. Return response
    console.log("[/api/analyze] Analysis complete, sending response.");
    return NextResponse.json({ 
      feedback, 
      analyzer: analyzerUsed,
      success: true, 
      resumeId: resumeId,
    });

  } catch (err: any) {
    console.error("[/api/analyze] Unexpected error:", err);
    return NextResponse.json({
      error: "Internal server error",
      details: err?.message || "Unknown error",
      type: "server_error"
    }, { status: 500 });
  }
}