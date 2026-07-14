// src/app/api/storage/[storageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storageId: string }> }
) {
  try {
    const { storageId } = await params;
    
    console.log("[Storage API] Fetching file for storageId:", storageId);
    
    // Get the signed URL from Convex
    const url = await fetchAction(api.resumes.getFileUrl, { 
      storageId: storageId as Id<"_storage"> 
    });
    
    if (!url) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    // Fetch the file from the signed URL
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: response.status }
      );
    }
    
    // Get the file as a blob
    const blob = await response.blob();
    
    // Return the file with appropriate headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `inline; filename="resume.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Storage API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch file", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}