// app/api/ai/insights/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

async function authenticateEmployer() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const token = (await getToken({ template: "convex" })) ?? undefined;
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Unable to verify session with Convex" },
        { status: 401 }
      ),
    } as const;
  }
  return { employerId: userId, token } as const;
}

export async function POST(request: Request) {
  try {
    const result = await authenticateEmployer();
    if ("error" in result) return result.error;
    const { employerId, token } = result;

    const { jobId } = await request.json();

    const insightId = await fetchMutation(
      api.ai.generateHiringInsights,
      { employerId, jobId: jobId ? (jobId as Id<"jobs">) : undefined },
      { token }
    );

    const insights = await fetchQuery(
      api.ai.getHiringInsights,
      { userId: employerId, jobId: jobId ? (jobId as Id<"jobs">) : undefined },
      { token }
    );

    return NextResponse.json({ success: true, insightId, insights });
  } catch (error) {
    console.error("Insights Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate hiring insights" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const result = await authenticateEmployer();
    if ("error" in result) return result.error;
    const { employerId, token } = result;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const insights = await fetchQuery(
      api.ai.getHiringInsights,
      { userId: employerId, jobId: jobId ? (jobId as Id<"jobs">) : undefined },
      { token }
    );

    return NextResponse.json({ success: true, insights });
  } catch (error) {
    console.error("Fetch Insights Error:", error);
    return NextResponse.json({ error: "Failed to fetch hiring insights" }, { status: 500 });
  }
}