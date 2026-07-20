// convex/applications.ts
import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Create an application
export const createApplication = mutation({
  args: {
    userId: v.string(),
    jobId: v.id("jobs"),
    status: v.union(
      v.literal("shortlisted"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offer"),
      v.literal("rejected"),
      v.literal("accepted"),
    ),
    notes: v.optional(v.string()),
    candidateName: v.optional(v.string()),
    candidateEmail: v.optional(v.string()),
    candidatePhone: v.optional(v.string()),
    candidateLocation: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    experience: v.optional(v.number()),
    resumeFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const job = await ctx.db.get(args.jobId);
    const employerId = job?.employerId ?? undefined;
    const isRealApply = args.status !== "shortlisted";

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_userId_jobId", (q) => q.eq("userId", args.userId).eq("jobId", args.jobId))
      .first();

    if (existing) {
      if (existing.submitted && isRealApply) {
        // Blocked duplicate real-apply attempt — record it, don't
        // silently succeed and don't silently fail either.
        const attempts = (existing.duplicateAttempts || 0) + 1;
        await ctx.db.patch(existing._id, { duplicateAttempts: attempts, updatedAt: now });
        throw new Error(`ALREADY_APPLIED:${attempts}`);
      }

      if (!existing.submitted && isRealApply) {
        // Upgrade an existing bookmark into a real application — same
        // document, so the employer sees exactly one application, not
        // a bookmark AND a separate apply.
        await ctx.db.patch(existing._id, {
          status: args.status,
          submitted: true,
          notes: args.notes ?? existing.notes,
          candidateName: args.candidateName ?? existing.candidateName,
          candidateEmail: args.candidateEmail ?? existing.candidateEmail,
          candidatePhone: args.candidatePhone ?? existing.candidatePhone,
          candidateLocation: args.candidateLocation ?? existing.candidateLocation,
          skills: args.skills ?? existing.skills,
          experience: args.experience ?? existing.experience,
          resumeFileId: args.resumeFileId ?? existing.resumeFileId,
          employerId,
          updatedAt: now,
        });

        if (args.resumeFileId && existing.analysisStatus !== "completed") {
          await ctx.scheduler.runAfter(0, internal.candidateScoring.analyzeCandidateApplication, {
            applicationId: existing._id,
            jobId: args.jobId,
            resumeFileId: args.resumeFileId,
          });
        }

        return existing._id;
      }

      // Re-bookmarking something already bookmarked (not yet submitted)
      // — no-op, just return the existing record.
      return existing._id;
    }

    const applicationId = await ctx.db.insert("applications", {
      userId: args.userId,
      jobId: args.jobId,
      employerId,
      status: args.status,
      notes: args.notes,
      savedAt: now,
      updatedAt: now,
      candidateName: args.candidateName,
      candidateEmail: args.candidateEmail,
      candidatePhone: args.candidatePhone,
      candidateLocation: args.candidateLocation,
      skills: args.skills,
      experience: args.experience,
      resumeFileId: args.resumeFileId,
      submitted: isRealApply,
      duplicateAttempts: 0,
      analysisStatus: args.resumeFileId ? "pending" : undefined,
    });

    if (args.resumeFileId) {
      await ctx.scheduler.runAfter(0, internal.candidateScoring.analyzeCandidateApplication, {
        applicationId,
        jobId: args.jobId,
        resumeFileId: args.resumeFileId,
      });
    }

    return applicationId;
  },
});

// Get applications by user
export const getUserApplications = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("applications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

//Get employer applications
export const getEmployerApplications = query({
  args: { employerId: v.string() },

  handler: async (ctx, { employerId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== employerId) {
      throw new Error("Unauthorized");
    }
   const applications = await ctx.db
      .query("applications")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .filter((q) => q.eq(q.field("submitted"), true))
      .collect();

    return applications;
  },
});

// Get applications by job
export const getJobApplications = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.query("applications")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .filter((q) => q.eq(q.field("submitted"), true))
      .collect();
  },
});

export const getApplicationById = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    return await ctx.db.get(applicationId);
  },
});

export const getUserApplicationsWithJobs = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const withJobs = await Promise.all(
      applications.map(async (app) => ({ ...app, job: await ctx.db.get(app.jobId) }))
    );

    // Drop applications whose job was hard-deleted, if that ever happens
    return withJobs.filter((a) => a.job !== null);
  },
});

// Update application status
export const updateApplicationStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(
      v.literal("shortlisted"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offer"),
      v.literal("rejected"),
      v.literal("accepted"),
      v.literal("reviewed") 
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, status, notes }) => {
    const application = await ctx.db.get(applicationId);
    if (!application) throw new Error("Application not found");
    await ctx.db.patch(applicationId, {
      status,
      notes,
      updatedAt: Date.now(),
    });
  },
});

export const deleteApplication = mutation({
  args: {
    applicationId: v.id("applications"),
  },
  handler: async (ctx, args) => {
    const { applicationId } = args;
    // You should add an authorization check here to ensure the user is allowed to delete this application.
    // For example:
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) {
    //   throw new Error("Unauthorized");
    // }
    // const existingApp = await ctx.db.get(applicationId);
    // if (existingApp?.userId !== identity.subject) {
    //   throw new Error("Unauthorized");
    // }

    await ctx.db.delete(applicationId);
  },
});

export const setApplicationAnalysisStatus = internalMutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, status, error }) => {
    await ctx.db.patch(applicationId, {
      analysisStatus: status,
      analysisError: error,
      updatedAt: Date.now(),
    });
  },
});

export const setApplicationAnalysis = internalMutation({
  args: {
    applicationId: v.id("applications"),
    matchScore: v.number(),
    summary: v.object({
      risk: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
      confidence: v.number(),
      recommendation: v.string(),
      topStrengths: v.array(v.string()),
      topWeaknesses: v.array(v.string()),
    }),
  },
  handler: async (ctx, { applicationId, matchScore, summary }) => {
    await ctx.db.patch(applicationId, {
      matchScore,
      analysisSummary: summary,
      analysisStatus: "completed",
      analysisError: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const getApplicationForUserAndJob = query({
  args: { userId: v.string(), jobId: v.id("jobs") },
  handler: async (ctx, { userId, jobId }) => {
    return await ctx.db
      .query("applications")
      .withIndex("by_userId_jobId", (q) => q.eq("userId", userId).eq("jobId", jobId))
      .first();
  },
});