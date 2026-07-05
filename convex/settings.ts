// convex/settings.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get notification preferences
export const getNotificationPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const prefs = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    return prefs?.notificationPreferences || {
      newApplications: true,
      interviewReminders: true,
      candidateMessages: true,
      jobExpirations: true,
      marketingUpdates: false,
    };
  },
});

// Update notification preferences
export const updateNotificationPreferences = mutation({
  args: {
    userId: v.string(),
    preferences: v.object({
      newApplications: v.boolean(),
      interviewReminders: v.boolean(),
      candidateMessages: v.boolean(),
      jobExpirations: v.boolean(),
      marketingUpdates: v.boolean(),
    }),
  },
  handler: async (ctx, { userId, preferences }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        notificationPreferences: preferences,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("settings", {
        userId,
        notificationPreferences: preferences,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});