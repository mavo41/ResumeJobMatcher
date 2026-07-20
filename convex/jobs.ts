import { Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";


// Create a new job (auth-aware)
export const createJob = mutation({
  args: {    
    userId: v.string(), 
    logoUrl: v.optional(v.id("_storage")),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    jobType: v.string(),
    description: v.string(),
    requirements: v.optional(v.array(v.string())),
    salaryRange: v.optional(v.string()),
    status: v.union(
      v.literal("open"), 
      v.literal("closed"), 
      v.literal("draft"),),
    tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
   if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
      
    }
   //EMPLOYER VERIFICATION - Only VERIFIED employers may publish jobs
    const employer = await ctx.db
  .query("employers")
  .withIndex("by_userId", (q) =>
    q.eq("userId", args.userId)
  )
  .unique();

  if (!employer) {
  throw new Error("Employer profile not found");
}
    
      //- If employer is NOT verified → force job to DRAFT
     // - Frontend publish requests are ignored

        const finalStatus =
  employer.verified && args.status === "open"
    ? "open"
    : "draft";

    const now = Date.now();

     // Check for existing job to avoid duplicates
    const existingJob = await ctx.db
      .query("jobs")
      .withIndex("by_employer_title_company_location", (q) =>
        q
          .eq("employerId", args.userId)
          .eq("title", args.title)
          .eq("company", args.company)
          .eq("location", args.location)
      )
      .first();

    if (existingJob) {
      throw new Error(`Duplicate job: ${args.title} at ${args.company}`);
      //          return { status: "skipped", reason: "duplicate", id: existingJob._id };

    }

    const jobId = await ctx.db.insert("jobs", {
      title: args.title,
      company: employer.companyName,
      description: args.description,
      location: args.location,
      jobType: args.jobType,
      requirements: args.requirements,
      salaryRange: args.salaryRange,
      status: finalStatus,          //  enforced by backend
      employerId: args.userId,

      createdAt: now,
      updatedAt: now,
      postedAt:  now,
      isRemoved: false,
      removedAt: undefined,
      removedBy: undefined,
      removalReason: undefined,


    });
    await ctx.db.insert("auditLogs", {
      actorId: identity.subject,
      action: "CREATE_JOB",
      entity: "job",
      entityId: jobId,
      metadata: {
        requestedStatus: args.status,
        finalStatus,
        employerVerified: employer.verified,
      },
      createdAt: now,
    });

    return {
      success: true,
      jobId,
      status: finalStatus,
    };
  },
});
  

// Get open jobs
export const getOpenJobs = query({
  args: { cursor: v.optional(v.string()), limit: v.number() },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_status_removed", (q) =>
        q.eq("status", "open").eq("isRemoved", false)
      )
      .order("desc")
      .paginate({
        cursor: args.cursor ?? null, 
        numItems: args.limit,
      });

    return jobs;
  },
});


// Get employer jobs with application counts
export const getEmployerJobs = query({
  args: { employerId: v.string() },
   handler: async (ctx, { employerId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== employerId) {
      throw new Error("Unauthorized");
    }

     const jobs = await ctx.db
       .query("jobs")
       .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
       .collect();

    // Get application counts for each job
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const applications = await ctx.db
          .query("applications")
          .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
          .collect();
        
        return {
          ...job,
          applications: applications.length,
        };
      })
    );

    return jobsWithCounts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get job stats with application counts
export const getJobStats = query({
  args: { employerId: v.string() },
  handler: async (ctx, { employerId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== employerId) {
      throw new Error("Unauthorized");
    }
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .collect();
    
    // Count applications for each job
    const applicationCounts = await Promise.all(
      jobs.map((job) =>
        ctx.db
          .query("applications")
          .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
          .collect()
          .then((apps) => apps.length)
      )
    );
    const totalApplications = applicationCounts.reduce((sum, c) => sum + c, 0);
    
    const activeJobs = jobs.filter(j => j.status === "open").length;
    
    return {
      activeJobs,
      totalApplications,
      totalJobs: jobs.length,
    };
  },
});


// Get single job BY ID
export const getJobById = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

// Update job
export const updateJob = mutation({
  args: {
    jobId: v.string(), // Change from v.id("jobs") to v.string()
    logoUrl: v.optional(v.id("_storage")),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    jobType: v.optional(v.string()), // ADD THIS
    description: v.optional(v.string()),
    requirements: v.optional(v.array(v.string())),
    salaryRange: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("draft"))),
    tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
  },
  handler: async (ctx, { jobId, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const job = await ctx.db.get(jobId as Id<"jobs">);
    if (!job || job.employerId !== identity.subject) {
      throw new Error("Job not found or not owned by user");
    }
    await ctx.db.patch(jobId as Id<"jobs">, { ...updates, updatedAt: Date.now() });
  },
});

// Delete job
export const deleteJob = mutation({
  args: { 
    jobId: v.string() // Change from v.id("jobs") to v.string()
  },
  handler: async (ctx, { jobId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    
    // Convert string to Id
    const job = await ctx.db.get(jobId as Id<"jobs">);
    if (!job || job.employerId !== identity.subject) {
      throw new Error("Job not found or not owned by user");
    }
    
    // Soft delete
    await ctx.db.patch(jobId as Id<"jobs">, {
      isRemoved: true,
      removedAt: Date.now(),
      removedBy: identity.subject,
      status: "closed",
    });
  },
});

export const recordJobView = mutation({
  args: { jobId: v.id("jobs"), viewerId: v.string() },
  handler: async (ctx, { jobId, viewerId }) => {
    const existing = await ctx.db
      .query("jobViews")
      .withIndex("by_jobId_viewerId", (q) => q.eq("jobId", jobId).eq("viewerId", viewerId))
      .first();

    if (existing) {
      return { newView: false };
    }

    await ctx.db.insert("jobViews", { jobId, viewerId, firstViewedAt: Date.now() });
    return { newView: true };
  },
});

export const getJobViewCount = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const views = await ctx.db
      .query("jobViews")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .collect();
    return views.length;
  },
});

// Batched version for the employer jobs list page — avoids N+1 queries
// when displaying a "Views" column across many job rows at once.
export const getJobViewCounts = query({
  args: { jobIds: v.array(v.id("jobs")) },
  handler: async (ctx, { jobIds }) => {
    const counts = await Promise.all(
      jobIds.map(async (jobId) => {
        const views = await ctx.db
          .query("jobViews")
          .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
          .collect();
        return [jobId, views.length] as const;
      })
    );
    return Object.fromEntries(counts);
  },
});

// export const incrementJobViews = mutation({
//   args: { jobId: v.id("jobs") },
//   handler: async (ctx, { jobId }) => {
//     const job = await ctx.db.get(jobId);
//     if (!job) return;
//     await ctx.db.patch(jobId, { views: (job.views || 0) + 1 });
//   },
// });

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// Log source fetch (for caching / rate limiting)
export const logSourceFetch = mutation({
  args: { source: v.string(), lastFetched: v.number(), jobCount: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
    .query("jobSourceLogs")
    .withIndex("by_source", (q) => q.eq("source", args.source))
    .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("jobSourceLogs", args);
    }
  },
});

// Get last fetch record
export const getLastSourceFetch = query({
  args: { source: v.string() },
  handler: async (ctx, { source }) => {
    return await ctx.db
    .query("jobSourceLogs")
    .withIndex("by_source", (q) => q.eq("source", source))
    .first();
  },
});

// Manage Greenhouse companies dynamically
export const addGreenhouseCompany = mutation({
  args: { 
    handle: v.string(),
     name: v.optional(v.string()),
     url: v.optional(v.string()) 
    },
  handler: async (ctx, { handle, name, url }) => {
    const now = Date.now();
    return await ctx.db.insert("greenhouseCompanies", {
      handle,
      name: name ?? handle, 
      url,
      addedAt: now,
    });
  },
});

export const getGreenhouseCompanies = query({
  handler: async (ctx) => {
    return await ctx.db.query("greenhouseCompanies").collect();
  },
});

export const removeGreenhouseCompany = mutation({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const docs = await ctx.db.query("greenhouseCompanies")
    .filter((q) => q.eq(q.field("handle"), handle))
    .collect();
    for (const d of docs) await ctx.db.delete(d._id);
    return { removed: docs.length };
  },
});

// Record fetch run logs metrics
export const recordFetchRun = mutation({
  args: { count: v.number(), warnings: v.array(v.string()), timestamp: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobFetchLogs", args);
  },
});

// Action: Cron-triggered fetch
const SOURCE_TIMEOUT_MS = 15_000;
const GREENHOUSE_COMPANY_TIMEOUT_MS = 10_000;
const MAX_GREENHOUSE_CONCURRENCY = 5;
const SIX_HOURS = 1000 * 60 * 60 * 6;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface SourceResult {
  source: string;
  status: "ok" | "skipped" | "failed" | "timeout";
  inserted: number;
  detail?: string;
}


async function fetchRemoteOKSource(ctx: any, now: number, force: boolean): Promise<SourceResult> {
  const last = await ctx.runQuery(internal.jobs.getSourceLog, { source: "remoteok" });
  if (!force && last && now - last.lastFetched < SIX_HOURS) {
    return { source: "remoteok", status: "skipped", inserted: 0, detail: "recent run" };
  }

  try {
    const resp = await fetchWithTimeout(
      "https://remoteok.com/api",
      {
        headers: {
          "User-Agent": "ResumeMatcher/1.0 (https://your-app.com; contact@example.com)",
          Accept: "application/json",
        },
      },
      SOURCE_TIMEOUT_MS
    );

    if (!resp.ok) {
      return { source: "remoteok", status: "failed", inserted: 0, detail: `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const remoteJobs = Array.isArray(data) ? data.filter((d: any) => d.slug || d.id) : [];
    const chunk = remoteJobs.slice(0, 50);

    let inserted = 0;
    for (let i = 0; i < chunk.length; i += 5) {
      const batch = chunk.slice(i, i + 5);
      await Promise.all(
        batch.map(async (job: any) => {
          try {
            await ctx.runMutation(internal.jobs.insertFetchedJob, {
              logoUrl: undefined,
              title: job.position || job.title || String(job.slug || job.id || "Untitled"),
              company: job.company || job.company_name || "Unknown",
              location: job.location || "Remote",
              description: job.description || "",
              source: "remoteok",
              externalUrl: job.url || undefined,
            });
            inserted++;
          } catch {
            // individual job insert failures don't abort the source
          }
        })
      );
    }

    await ctx.runMutation(internal.jobs.upsertSourceLog, {
      source: "remoteok",
      lastFetched: now,
      jobCount: remoteJobs.length,
    });

    return { source: "remoteok", status: "ok", inserted };
  } catch (err: any) {
    const detail = err?.name === "AbortError" ? "timed out" : err?.message || "unknown error";
    return {
      source: "remoteok",
      status: err?.name === "AbortError" ? "timeout" : "failed",
      inserted: 0,
      detail,
    };
  }
}
async function fetchRemotiveSource(ctx: any, now: number, force: boolean): Promise<SourceResult> {

  const last = await ctx.runQuery(internal.jobs.getSourceLog, { source: "remotive" });
if (!force && last && now - last.lastFetched < SIX_HOURS) {
      return { source: "remotive", status: "skipped", inserted: 0, detail: "recent run" };
  }

  try {
    const resp = await fetchWithTimeout(
      "https://remotive.io/api/remote-jobs",
      {},
      SOURCE_TIMEOUT_MS
    );

    if (!resp.ok) {
      return { source: "remotive", status: "failed", inserted: 0, detail: `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const remJobs = Array.isArray(data.jobs) ? data.jobs : [];
    const chunk = remJobs.slice(0, 50);

    let inserted = 0;
    for (let i = 0; i < chunk.length; i += 5) {
      const batch = chunk.slice(i, i + 5);
      await Promise.all(
        batch.map(async (job: any) => {
          try {
            await ctx.runMutation(internal.jobs.insertFetchedJob, {
              logoUrl: undefined,
              title: job.title || job.position || "Untitled",
              company: job.company_name || "Unknown",
              location: job.candidate_required_location || "Remote",
              description: job.description || "",
              source: "remotive",
              externalUrl: job.url || undefined,
            });
            inserted++;
          } catch {
            // individual job insert failures don't abort the source
          }
        })
      );
    }

    await ctx.runMutation(internal.jobs.upsertSourceLog, {
      source: "remotive",
      lastFetched: now,
      jobCount: remJobs.length,
    });

    return { source: "remotive", status: "ok", inserted };
  } catch (err: any) {
    const detail = err?.name === "AbortError" ? "timed out" : err?.message || "unknown error";
    return {
      source: "remotive",
      status: err?.name === "AbortError" ? "timeout" : "failed",
      inserted: 0,
      detail,
    };
  }
}

async function fetchOneGreenhouseCompany(
  ctx: any,
  company: { handle: string; name: string }
): Promise<{ inserted: number; warning?: string }> {
  try {
    const resp = await fetchWithTimeout(
      `https://boards-api.greenhouse.io/v1/boards/${company.handle}/jobs`,
      {},
      GREENHOUSE_COMPANY_TIMEOUT_MS
    );

    if (!resp.ok) {
      return { inserted: 0, warning: `Greenhouse ${company.handle}: HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const jobsList = data.jobs || [];
    const chunk = jobsList.slice(0, 50);

    let inserted = 0;
    for (let i = 0; i < chunk.length; i += 5) {
      const batch = chunk.slice(i, i + 5);
      await Promise.all(
        batch.map(async (job: any) => {
          try {
            await ctx.runMutation(internal.jobs.insertFetchedJob, {
              logoUrl: undefined,
              title: job.title || "Untitled",
              company: company.name || company.handle,
              location: job.location?.name || "Remote",
              description: job.content || "",
              source: "greenhouse",
              externalUrl: job.url || undefined,
            });
            inserted++;
          } catch {
            // individual job insert failures don't abort the company
          }
        })
      );
    }

    return { inserted };
  } catch (err: any) {
    const detail = err?.name === "AbortError" ? "timed out" : err?.message || "unknown error";
    return { inserted: 0, warning: `Greenhouse ${company.handle}: ${detail}` };
  }
}

async function fetchGreenhouseSource(ctx: any, now: number, force: boolean): Promise<SourceResult> {

  const last = await ctx.runQuery(internal.jobs.getSourceLog, { source: "greenhouse" });
if (!force && last && now - last.lastFetched < SIX_HOURS) {
      return { source: "greenhouse", status: "skipped", inserted: 0, detail: "recent run" };
  }

  const companies = await ctx.runQuery(internal.jobs.getAllGreenhouseCompaniesInternal, {});
  const warnings: string[] = [];
  let totalInserted = 0;

  // Bounded concurrency: process companies in fixed-size batches rather
  // than fully sequential (old behavior) or fully unbounded parallel
  // (which could hammer many companies' APIs at once).
  for (let i = 0; i < companies.length; i += MAX_GREENHOUSE_CONCURRENCY) {
    const batch = companies.slice(i, i + MAX_GREENHOUSE_CONCURRENCY);
    const results = await Promise.all(batch.map((c: any) => fetchOneGreenhouseCompany(ctx, c)));
    for (const r of results) {
      totalInserted += r.inserted;
      if (r.warning) warnings.push(r.warning);
    }
  }

  await ctx.runMutation(internal.jobs.upsertSourceLog, {
    source: "greenhouse",
    lastFetched: now,
    jobCount: totalInserted,
  });

  return {
    source: "greenhouse",
    status: warnings.length > 0 && totalInserted === 0 ? "failed" : "ok",
    inserted: totalInserted,
    detail: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}

export const fetchAllSources = action({
   args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force = false }): Promise<{ status: string; results: SourceResult[] }> => {
    const now = Date.now();

    const schedulerLog = await ctx.runQuery(internal.jobs.getSourceLog, { source: "scheduler" });
    if (!force && schedulerLog && now - schedulerLog.lastFetched < SIX_HOURS) {
      return { status: "skipped", results: [{ source: "scheduler", status: "skipped", inserted: 0, detail: "recent run" }] };
    }
    await ctx.runMutation(internal.jobs.upsertSourceLog, {
      source: "scheduler",
      lastFetched: now,
      jobCount: 0,
    });

    // The three sources are now fully independent — Promise.allSettled
    // guarantees each one's success/failure has zero effect on the
    // others (Issue #8). Previously these ran sequentially inside
    // individual try/catch blocks; the isolation was accidental. It is
    // now explicit and guaranteed by construction.
    const settled = await Promise.allSettled([
      fetchRemoteOKSource(ctx, now, force),
      fetchRemotiveSource(ctx, now, force),
      fetchGreenhouseSource(ctx, now, force),
    ]);

    const results: SourceResult[] = settled.map((s, i) => {
      const sourceName = ["remoteok", "remotive", "greenhouse"][i];
      if (s.status === "fulfilled") return s.value;
      return { source: sourceName, status: "failed", inserted: 0, detail: String(s.reason) };
    });

    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
    const allWarnings = results.filter((r) => r.detail).map((r) => `${r.source}: ${r.detail}`);

    await ctx.runMutation(internal.jobs.insertJobFetchLog, {
      count: totalInserted,
      warnings: allWarnings,
      timestamp: now,
    });

    console.log(
      `✅ fetchAllSources complete. Inserted ${totalInserted} jobs. Results: ${JSON.stringify(results)}`
    );

    return { status: "ok", results };
  },
});


export const getEmployerJobModerationStatus = query({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, { jobId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const job = await ctx.db.get(jobId);
    if (!job || job.employerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Only expose moderation fields (NOT admin identity)
    return {
      isRemoved: job.isRemoved,
      removalReason: job.removalReason ?? null,
      removedAt: job.removedAt ?? null,
      status: job.status,
    };
  },
});

export const insertFetchedJob = internalMutation({
  args: {
    logoUrl: v.optional(v.id("_storage")),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    description: v.string(),
    requirements: v.optional(v.array(v.string())),
    salaryRange: v.optional(v.string()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("draft"))),
    tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
     source: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("jobs", {
      logoUrl: args.logoUrl,
      title: args.title,
      company: args.company,
      location: args.location,
      postedAt: now,
      description: args.description,
      requirements: args.requirements ?? [],
      salaryRange: args.salaryRange,
      status: args.status ?? "open",
      tag: args.tag ?? "RECOMMENDED",
      employerId: "", // system-sourced job
      source: args.source,
      externalUrl: args.externalUrl,
      createdAt: now,
      updatedAt: now,
      isRemoved: false,
      removedAt: undefined,
      removedBy: undefined,
      removalReason: undefined,
    });
  },
});

export const upsertSourceLog = internalMutation({
  args: { source: v.string(), lastFetched: v.number(), jobCount: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobSourceLogs")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("jobSourceLogs", args);
    }
  },
});

export const getSourceLog = internalQuery({
  args: { source: v.string() },
  handler: async (ctx, { source }) => {
    return await ctx.db
      .query("jobSourceLogs")
      .withIndex("by_source", (q) => q.eq("source", source))
      .first();
  },
});

export const getAllGreenhouseCompaniesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("greenhouseCompanies").collect();
  },
});

export const insertJobFetchLog = internalMutation({
  args: { count: v.number(), warnings: v.array(v.string()), timestamp: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("jobFetchLogs", args);
  },
});

