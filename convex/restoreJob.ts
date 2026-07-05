import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const restoreJob = mutation({
  args: {
    jobId: v.id("jobs"),
  },

  handler: async (ctx, { jobId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Admin check
    const admin = await ctx.db
      .query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found");

    if (!job.isRemoved) {
      return { success: true, alreadyActive: true };
    }

    const now = Date.now();

    await ctx.db.patch(jobId, {
      isRemoved: false,
      removedAt: undefined,
      removedBy: undefined,
      removalReason: undefined,
      status: "draft", // employer must re-publish explicitly
      updatedAt: now,
    });

    // ✅ Audit log
    await ctx.db.insert("auditLogs", {
      actorId: identity.subject,
      action: "RESTORE_JOB",
      entity: "job",
      entityId: jobId,
      metadata: {
        previousStatus: job.status,
      },
      createdAt: now,
    });

    return {
      success: true,
      jobId,
      restored: true,
    };
  },
});
