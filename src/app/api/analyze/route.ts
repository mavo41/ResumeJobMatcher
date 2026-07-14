// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export async function POST(request: NextRequest) {
  console.log("[/api/analyze] Scheduling background analysis");

  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (await getToken({ template: "convex" })) ?? undefined;
    if (!token) {
      return NextResponse.json(
        { error: "Unable to verify session with Convex" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { fileStorageId, jobTitle = "", jobDescription = "", resumeId } = body ?? {};

    if (!fileStorageId) {
      return NextResponse.json({ error: "Missing fileStorageId" }, { status: 400 });
    }
    if (!resumeId) {
      return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
    }

    // Verify the resume belongs to the caller before scheduling. This is
    // a fast query — getResume already returns null for non-owners.
    const resume = await fetchQuery(
      api.resumes.getResume,
      { id: resumeId as Id<"resumes"> },
      { token }
    );

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found or access denied" },
        { status: 404 }
      );
    }

    // This mutation is fast — it only validates ownership and enqueues
    // the background job. It does not wait for Gemini or PDF parsing.
    await fetchMutation(
      api.resumes.scheduleAnalysis,
      {
        resumeId: resumeId as Id<"resumes">,
        fileStorageId: fileStorageId as Id<"_storage">,
        jobTitle,
        jobDescription,
      },
      { token }
    );

    return NextResponse.json({
      success: true,
      status: "scheduled",
      resumeId,
      message: "Resume analysis started. Results will update automatically.",
    });
  } catch (err: any) {
    console.error("[/api/analyze] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}