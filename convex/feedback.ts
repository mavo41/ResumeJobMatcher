// convex/feedback.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const recordOutcome = mutation({
  args: {
    candidateId: v.string(),
    score: v.number(),
    breakdown: v.object({
      skills: v.number(),
      experience: v.number(),
      education: v.number(),
      projects: v.number(),
      certifications: v.number(),
      achievements: v.number(),
    }),
    interviewed: v.boolean(),
    hired: v.boolean(),
    rejected: v.boolean(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("feedbackOutcomes", {
      ...args,
      employerId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const updateWeights = mutation({
  args: {
    weights: v.object({
      skills: v.number(),
      experience: v.number(),
      education: v.number(),
      projects: v.number(),
      certifications: v.number(),
      achievements: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("modelWeights")
      .withIndex("by_employerId", (q) => q.eq("employerId", identity.subject))
      .first();

    const data = {
      employerId: identity.subject,
      weights: args.weights,
      updatedAt: Date.now(),
      version: existing ? (existing.version || 0) + 1 : 1,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("modelWeights", data);
    }
  },
});

export const getWeights = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("modelWeights")
      .withIndex("by_employerId", (q) => q.eq("employerId", identity.subject))
      .first();
  },
});