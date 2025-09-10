// src/app/api2/fetchJobs.ts
// route that fetches jobs from RemoteOK, Remotive, Greenhouse (dynamic list),validates data, caches results, and inserts into Convex DB.

import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { z } from "zod";

//  Schema validation (ensures jobs have the right structure before insert)
const JobSchema = z.object({
  logoUrl: z.string().optional(),
  title: z.string().min(1, "Missing title"),
  company: z.string().min(1, "Missing company"),
  location: z.string().default("Remote"),
  description: z.string().optional().default(""),
  status: z.enum(["open", "closed", "draft"]).default("open"),
  tag: z.enum(["MATCH", "RECOMMENDED"]).optional(),
});

//   cache window (6 hours, consistent with cron schedule)
const CACHE_WINDOW = 1000 * 60 * 60 * 6;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("apiKey");

  // Protect this route with an internal API key
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Trigger the Convex mutation that performs all fetching, caching, inserts
    const result = await fetchMutation(api.jobs.fetchAllSources, {});

    return NextResponse.json({
      status: "ok",
      result,
      message: "Triggered Convex fetchAllSources",
    });
  } catch (error: any) {
    console.error("Error triggering fetchAllSources:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
