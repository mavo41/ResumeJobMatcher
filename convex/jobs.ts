import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new job (auth-aware)
export const createJob = mutation({
  args: {
    logoUrl: v.optional(v.string()),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    postedAt: v.number(),
    description: v.string(),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("draft")),
    tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
    userId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || args.userId || "system";

    const now = Date.now();

       // Check for existing job to avoid duplicates
    const existingJob = await ctx.db
      .query("jobs")
      .filter((q) =>
        q.and(
          q.eq(q.field("title"), args.title),
          q.eq(q.field("company"), args.company),
          q.eq(q.field("location"), args.location)
        )
      )
      .first();

    if (existingJob) {
      console.log(`Skipping duplicate job: ${args.title} at ${args.company}`);
      return { status: "skipped", reason: "duplicate", id: existingJob._id };
    }
    
    return await ctx.db.insert("jobs", {
      ...args,
      userId,
      createdAt: args.createdAt ?? now,
      updatedAt: args.updatedAt ?? now,
      postedAt: args.postedAt ?? now,
    });
  },
});

// Get open jobs
export const getOpenJobs = query({
  args: { cursor: v.optional(v.string()), limit: v.number() },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .paginate({
        cursor: args.cursor ?? null, 
        numItems: args.limit,
      });

    return jobs;
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
    jobId: v.id("jobs"),
    logoUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    postedAt: v.optional(v.number()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("draft"))),
    tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
  },
  handler: async (ctx, { jobId, ...updates }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found");
    await ctx.db.patch(jobId, { ...updates, updatedAt: Date.now() });
  },
});

// Delete job
export const deleteJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    await ctx.db.delete(jobId);
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
export const fetchAllSources = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const SIX_HOURS = 1000 * 60 * 60 * 6;

    // Checking global jobSourceLogs timestamp for "scheduler" to avoid doubling up
    const lastGlobal = await ctx.db
    .query("jobSourceLogs")
    .withIndex("by_source", (q) => q.eq("source", "scheduler"))
    .first();
    if (lastGlobal && now - lastGlobal.lastFetched < SIX_HOURS) {
      return { status: "skipped", reason: "recent run" };
    }

    // Mark scheduler run start (or update)
    const existingSchedulerLog = await ctx.db
      .query("jobSourceLogs")
      .withIndex("by_source", (q) => q.eq("source", "scheduler"))
      .first();

    if (existingSchedulerLog) {
      await ctx.db.patch(existingSchedulerLog._id, {
        lastFetched: now,
        jobCount: 0,
      });
    } else {
      await ctx.db.insert("jobSourceLogs", {
        source: "scheduler",
        lastFetched: now,
        jobCount: 0,
      });
    }

    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "system";

    const warnings: string[] = [];
    let inserted = 0;

    // Helper to insert normalized job (ensures required timestamps are present)
    async function safeInsertJob(normalized: {
      logoUrl?: string;
      title: string;
      company: string;
      location: string;
      description: string;
      status?: "open" | "closed" | "draft";
      tag?: "MATCH" | "RECOMMENDED";
    }) {
      const nowTs = Date.now();
      try {
      await ctx.db.insert("jobs", {
        logoUrl: normalized.logoUrl,
        title: normalized.title,
        company: normalized.company,
        location: normalized.location,
        postedAt: nowTs,
        description: normalized.description,
        status: normalized.status ?? "open",
        tag: normalized.tag ?? "RECOMMENDED",
        userId,
        createdAt: nowTs,
        updatedAt: nowTs,
      });
      inserted++;
       } catch (e: any) {
        warnings.push(`DB insert failed for ${normalized.title}: ${e.message}`);
        console.error("DB insert error:", e);
      }
    }

    // 1. RemoteOK fetch
    try {
      const lastRemote = await ctx.db
      .query("jobSourceLogs")
      .withIndex("by_source", (q) => q.eq("source", "remoteok"))
      .first();
      if (!lastRemote || (now - lastRemote.lastFetched) > SIX_HOURS) {
        const resp = await fetch("https://remoteok.com/api", {
          headers: { "User-Agent":
             "ResumeMatcher/1.0 (https://your-app.com; contact@example.com)", 
             "Accept": "application/json" },
        });
        if (resp.ok) {
          const data = await resp.json();
          const remoteJobs = Array.isArray(data)
           ? data.filter((d: any) => d.slug || d.id) : [];
          const chunk = remoteJobs.slice(0, 50);
          for (let i = 0; i < chunk.length; i += 5) {
            const batch = chunk.slice(i, i + 5);
            await Promise.all(batch.map(async (job: any) => {
              try {
                await safeInsertJob({
                  logoUrl: job.company_logo || job.logo || undefined,
                  title: job.position || job.title || String(job.slug || job.id || "Untitled"),
                  company: job.company || job.company_name || "Unknown",
                  location: job.location || "Remote",
                  description: job.description || "",
                });
              } catch (e) {
                warnings.push(`RemoteOK validation/insert failed for ${job.slug || job.id}`);
              }
            }));
          }
          const existingRemote = await ctx.db.query("jobSourceLogs").withIndex("by_source", (q) => q.eq("source", "remoteok")).first();
          await ctx.db.patch(existingRemote?._id ?? (await ctx.db.insert("jobSourceLogs", { source: "remoteok", lastFetched: now, jobCount: remoteJobs.length })), {
            lastFetched: now,
            jobCount: remoteJobs.length,
          }).catch(async () => {
            await ctx.db.insert("jobSourceLogs", { source: "remoteok", lastFetched: now, jobCount: remoteJobs.length });
          });
        } else {
          warnings.push("RemoteOK responded non-OK");
        }
      }
    } catch (err) {
      warnings.push("RemoteOK fetch error");
      console.error("RemoteOK fetch error:", err);
    }

    // 2. Remotive
    try {
      const lastRem = await ctx.db.query("jobSourceLogs").withIndex("by_source", (q) => q.eq("source", "remotive")).first();
      if (!lastRem || (now - lastRem.lastFetched) > SIX_HOURS) {
        const resp = await fetch("https://remotive.io/api/remote-jobs");
        if (resp.ok) {
          const data = await resp.json();
          const remJobs = Array.isArray(data.jobs) ? data.jobs : (data.jobs || []);
          const chunk = remJobs.slice(0, 50);
          for (let i = 0; i < chunk.length; i += 5) {
            const batch = chunk.slice(i, i + 5);
            await Promise.all(batch.map(async (job: any) => {
              try {
                await safeInsertJob({
                  logoUrl: job.company_logo || undefined,
                  title: job.title || job.position || "Untitled",
                  company: job.company_name || "Unknown",
                  location: job.candidate_required_location || "Remote",
                  description: job.description || "",
                });
              } catch (e) {
                warnings.push(`Remotive validation/insert failed for ${job.id || job.title}`);
              }
            }));
          }
          const existingRemotive = await ctx.db
          .query("jobSourceLogs")
          .withIndex("by_source", (q) => q
          .eq("source", "remotive"))
          .first();
          await ctx.db.patch(existingRemotive?._id ?? (await ctx.db.insert("jobSourceLogs", { source: "remotive", lastFetched: now, jobCount: remJobs.length })), {
            lastFetched: now,
            jobCount: remJobs.length,
          }).catch(async () => {
            await ctx.db.insert("jobSourceLogs", { source: "remotive", lastFetched: now, jobCount: remJobs.length });
          });
        } else {
          warnings.push("Remotive responded non-OK");
        }
      }
    } catch (err) {
      warnings.push("Remotive fetch error");
      console.error("Remotive fetch error:", err);
    }

    // 3. Greenhouse
    try {
      const lastGh = await ctx.db.query("jobSourceLogs").withIndex("by_source", (q) => q.eq("source", "greenhouse")).first();
      if (!lastGh || (now - lastGh.lastFetched) > SIX_HOURS) {
        const companies = await ctx.db.query("greenhouseCompanies").collect();
        for (const company of companies) {
          try {
            const resp = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company.handle}/jobs`);
            if (!resp.ok) { warnings.push(`Greenhouse ${company.handle} non-OK`); continue; }
            const data = await resp.json();
            const jobsList = data.jobs || [];
            const chunk = jobsList.slice(0, 50);
            for (let i = 0; i < chunk.length; i += 5) {
              const batch = chunk.slice(i, i + 5);
              await Promise.all(batch.map(async (job: any) => {
                try {
                  await safeInsertJob({
                    logoUrl: undefined,
                    title: job.title || "Untitled",
                    company: company.name || company.handle,
                    location: job.location?.name || "Remote",
                    description: job.content || "",
                  });
                } catch (e) {
                  warnings.push(`Greenhouse insert failed for ${company.handle}:${job.id}`);
                }
              }));
            }
          } catch (e) {
            warnings.push(`Greenhouse fetch error for ${company.handle}`);
          }
        }
        const existingGreenhouse = await ctx.db.query("jobSourceLogs").withIndex("by_source", (q) => q.eq("source", "greenhouse")).first();
        await ctx.db.patch(existingGreenhouse?._id ?? (await ctx.db.insert("jobSourceLogs", { source: "greenhouse", lastFetched: now, jobCount: 0 })), {
          lastFetched: now,
          jobCount: 0,
        }).catch(async () => {
          await ctx.db.insert("jobSourceLogs", { source: "greenhouse", lastFetched: now, jobCount: 0 });
        });
      }
    } catch (err) {
      warnings.push("Greenhouse flow error");
      console.error("Greenhouse flow error:", err);
    }

    console.log("✅ Finished fetching jobs from all sources.");
    await ctx.db.insert("jobFetchLogs", { count: inserted, warnings, timestamp: Date.now() }).catch(() => { /* ignore */ });

    return { status: "ok", inserted, warnings };
  },
});

