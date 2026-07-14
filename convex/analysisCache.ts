// convex/analysisCache.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { contentHash: v.string() },
  handler: async (ctx, { contentHash }) => {
    return await ctx.db
      .query("resumeAnalysisCache")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", contentHash))
      .first();
  },
});

export const set = mutation({
  args: { contentHash: v.string(), feedback: v.any() },
  handler: async (ctx, { contentHash, feedback }) => {
    const existing = await ctx.db
      .query("resumeAnalysisCache")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", contentHash))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { feedback });
    } else {
      await ctx.db.insert("resumeAnalysisCache", {
        contentHash,
        feedback,
        createdAt: Date.now(),
      });
    }
  },
});