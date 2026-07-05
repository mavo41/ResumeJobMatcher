import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
      .filter((q) =>
        q.and(
          q.eq(q.field("title"), args.title),
          q.eq(q.field("company"), args.company),
          q.eq(q.field("location"), args.location),
          q.eq(q.field("employerId"), identity.subject)
        )
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
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .filter(q => q.eq(q.field("isRemoved"), false))
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
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .collect();
    
    // Count applications for each job
    let totalApplications = 0;
    for (const job of jobs) {
      const apps = await ctx.db
        .query("applications")
        .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
        .collect();
      totalApplications += apps.length;
    }
    
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
      logoUrl?: Id<"_storage">;
      title: string;
      company: string;
      location: string;
      description: string;
      requirements?: string[];
      salaryRange?: string;

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
        requirements: normalized.requirements ?? [],
        salaryRange: normalized.salaryRange,
        status: normalized.status ?? "open",
        tag: normalized.tag ?? "RECOMMENDED",
        employerId: "", // system user
        createdAt: nowTs,
        updatedAt: nowTs,
        isRemoved: false,
        removedAt: undefined,
        removedBy: undefined,
        removalReason: undefined,

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

