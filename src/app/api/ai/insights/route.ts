// app/api/ai/insights/route.ts
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { employerId, jobId } = await request.json();

    if (!employerId) {
      return NextResponse.json(
        { error: "employerId is required" },
        { status: 400 }
      );
    }

    // Generate hiring insights - cast jobId to Id<"jobs"> if provided
    const insightId = await convex.mutation(api.ai.generateHiringInsights, {
      employerId,
      jobId: jobId ? (jobId as Id<"jobs">) : undefined,
    });

    // Fetch the generated insights
    const insights = await convex.query(api.ai.getHiringInsights, {
      userId: employerId,
      jobId: jobId ? (jobId as Id<"jobs">) : undefined,
    });

    return NextResponse.json({
      success: true,
      insightId,
      insights,
    });
  } catch (error) {
    console.error("Insights Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate hiring insights" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employerId = searchParams.get('employerId');
    const jobId = searchParams.get('jobId');

    if (!employerId) {
      return NextResponse.json(
        { error: "employerId is required" },
        { status: 400 }
      );
    }

    const insights = await convex.query(api.ai.getHiringInsights, {
      userId: employerId,
      jobId: jobId ? (jobId as Id<"jobs">) : undefined,
    });

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("Fetch Insights Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hiring insights" },
      { status: 500 }
    );
  }
}