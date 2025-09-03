import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
  userId: v.string(),
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    Image: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
      await ctx.db.insert("users", args);
    }
  },
});

export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const syncUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    Image: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
    } else {
      await ctx.db.insert("users", args);
    }
  },
});

export const updateUser = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    clerkId: v.string(),
    Image: v.optional(v.string()),
    // Optional fields for diet and workout plans
    dietPlan: v.optional(
      v.object({
        days: v.array(
          v.object({
            day: v.string(),
            meals: v.array(
              v.object({
                description: v.string(),
                time: v.string(),
              })
            ),
          })
        ),
      })
    ),
    workoutPlan: v.optional(
      v.object({
        days: v.array(
          v.object({
            day: v.string(),
            exercises: v.array(
              v.object({
                name: v.string(),
                sets: v.number(),
                reps: v.number(),
              })
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
      throw new Error("User not found");
    }

    const { userId, ...updates } = args;
    await ctx.db.patch(existing._id, updates);
  },
});
