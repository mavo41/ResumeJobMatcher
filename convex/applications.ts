// convex/applications.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    return await ctx.db.insert("applications", {
      userId: args.userId,
      jobId: args.jobId,
      status: args.status,
      notes: args.notes,
      savedAt: now,
      updatedAt: now,
      // Include the new fields
      candidateName: args.candidateName,
      candidateEmail: args.candidateEmail,
      candidatePhone: args.candidatePhone,
      candidateLocation: args.candidateLocation,
      skills: args.skills,
      experience: args.experience,
      resumeFileId: args.resumeFileId,
    });
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
    // Get all jobs for this employer
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .collect();
    
    const jobIds = jobs.map(j => j._id);
    
    // Get all applications for these jobs
    const applications = await Promise.all(
      jobIds.map(async (jobId) => {
        const apps = await ctx.db
          .query("applications")
          .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
          .collect();
        return apps;
      })
    );
    
    return applications.flat();
  },
});

// Get applications by job
export const getJobApplications = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.query("applications")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .collect();
  },
});

export const getApplicationById = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    return await ctx.db.get(applicationId);
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