// convex/notifications.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get unread notifications count for a user
export const getUnreadCount = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => 
        q.eq("userId", userId).eq("read", false)
      )
      .collect();
    return notifications.length;
  },
});

// Get all notifications for a user
export const getNotifications = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit = 50 }) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    return notifications;
  },
});

// Mark a notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification) throw new Error("Notification not found");
    await ctx.db.patch(notificationId, { read: true });
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => 
        q.eq("userId", userId).eq("read", false)
      )
      .collect();
    
    await Promise.all(
      notifications.map((n) => ctx.db.patch(n._id, { read: true }))
    );
  },
});

// Create a notification (internal use)
export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("new_application"),
      v.literal("interview_reminder"),
      v.literal("candidate_message"),
      v.literal("job_expiration"),
      v.literal("marketing_update"),
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: Date.now(),
    });
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.delete(notificationId);
  },
});