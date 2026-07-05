// convex/embeddingsCache.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const cached = await ctx.db
      .query("embeddingsCache")
      .withIndex("by_text", (q) => q.eq("text", text))
      .first();

    return cached;
  },
});

export const set = mutation({
  args: {
    text: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, { text, embedding }) => {
    const existing = await ctx.db
      .query("embeddingsCache")
      .withIndex("by_text", (q) => q.eq("text", text))
      .first();

    const data = {
      text,
      embedding,
      createdAt: existing?.createdAt || Date.now(),
      accessedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("embeddingsCache", data);
    }
  },
});