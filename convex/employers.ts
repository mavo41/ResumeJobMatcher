import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get employer profile with company info
export const getEmployerProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const employer = await ctx.db
      .query("employers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    
    if (!employer) return null;
    
    // Get user info
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    
    return {
      ...employer,
      user,
    };
  },
});

export const getEmployerByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("employers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

// Create or update employer profile
export const createOrUpdateEmployerProfile = mutation({
  args: {
    userId: v.string(),
    companyName: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    phone: v.optional(v.string()),

    logoFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("employers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (existing[0]) {
      // Update
     await ctx.db.patch(existing[0]._id, args);
      return { ...existing[0], ...args };
    } else {
      // Create
      return await ctx.db.insert("employers", {
        ...args,
        verified: false,
      });
    }
  },
});
