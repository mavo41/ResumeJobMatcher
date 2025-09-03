// convex/jobs.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new job
export const createJob = mutation({
  args: {
    logoUrl: v.optional(v.string()),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    description: v.string(),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("draft")),
     tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
     userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("jobs", {
      ...args,
      createdAt: now,
      updatedAt: now,
      postedAt: now,
    });
  },
});

// Get all open jobs
export const getOpenJobs = query({
  handler: async (ctx) => {
    return await ctx.db.query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
  },
});

// Get job by ID
export const getJobById = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

// Update a job
export const updateJob = mutation({
  args: {
    logoUrl: v.optional(v.string()),
    jobId: v.id("jobs"),
    title: v.optional(v.string()),
    company: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("draft"))),
     tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
     userId: v.string(),
  },
  handler: async (ctx, { jobId, ...updates }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found");
    await ctx.db.patch(jobId, { ...updates, updatedAt: Date.now() });
  },
});

// Delete a job
export const deleteJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    await ctx.db.delete(jobId);
  },
});
