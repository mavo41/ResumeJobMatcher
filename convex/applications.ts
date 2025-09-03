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
      v.literal("accepted")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("applications", {
      ...args,
      savedAt: now,
      updatedAt: now,
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

// Get applications by job
export const getJobApplications = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.query("applications")
      .withIndex("by_jobId", (q) => q.eq("jobId", jobId))
      .collect();
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
      v.literal("accepted")
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

// Delete an application
export const deleteApplication = mutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    await ctx.db.delete(applicationId);
  },
});
