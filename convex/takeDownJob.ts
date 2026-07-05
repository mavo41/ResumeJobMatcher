import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const takedownJob = mutation({
  args: {
    jobId: v.id("jobs"),
    reason: v.string(),
  },

  handler: async (ctx, { jobId, reason }) => {
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

    if (job.isRemoved) {
      return { success: true, alreadyRemoved: true };
    }

    await ctx.db.patch(jobId, {
      isRemoved: true,
      removedAt: Date.now(),
      removedBy: identity.subject,
      removalReason: reason,
      status: "closed", // force visibility off
    });
    if (job.isRemoved) {
  throw new Error("This job has been removed by admin");
}


await ctx.db.insert("auditLogs", {
  actorId: identity.subject,
  action: "TAKEDOWN_JOB",
  entity: "job",
  entityId: jobId,
  metadata: {
    reason,
  },
  createdAt: Date.now(),
});

    return {
      success: true,
      jobId,
      removed: true,
    };
  },
});
