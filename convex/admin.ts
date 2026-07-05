import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const verifyEmployer = mutation({
  args: {
    employerUserId: v.string(),
  },

  handler: async (ctx, { employerUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Ensure caller is ADMIN
    const admin = await ctx.db
      .query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Fetch employer profile
    const employer = await ctx.db
      .query("employers")
      .withIndex("by_userId", q => q.eq("userId", employerUserId))
      .unique();

    if (!employer) {
      throw new Error("Employer not found");
    }

    if (employer.verified) {
      return { success: true, alreadyVerified: true };
    }

    // Verify employer
    await ctx.db.patch(employer._id, {
      verified: true,
    });

    // 🔒 Optional audit (enable once schema exists)
    /*
    await ctx.db.insert("auditLogs", {
      actorId: identity.subject,
      action: "VERIFY_EMPLOYER",
      entity: "employer",
      entityId: employer._id,
      metadata: {
        verifiedUserId: employerUserId,
      },
      createdAt: Date.now(),
    });
    */

    return {
      success: true,
      employerUserId,
      verified: true,
    };
  },
});
export const getRemovedJobs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("jobs")
      .filter(q => q.eq(q.field("isRemoved"), true))
      .order("desc")
      .collect();
  },
});

export const getAdminStats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const [jobs, removedJobs, employers] = await Promise.all([
      ctx.db.query("jobs").collect(),
      ctx.db.query("jobs").filter(q => q.eq(q.field("isRemoved"), true)).collect(),
      ctx.db.query("employers").collect(),
    ]);

    return {
      totalJobs: jobs.length,
      removedJobs: removedJobs.length,
      employers: employers.length,
    };
  },
});


export const adminGetAllJobs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("jobs")
      .order("desc")
      .collect();
  },
});

export const adminGetRemovedJobs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("jobs")
      .filter(q => q.eq(q.field("isRemoved"), true))
      .order("desc")
      .collect();
  },
});

export const adminGetJobAuditLogs = query({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, { jobId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("by_userId", q => q.eq("userId", identity.subject))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_entity", q =>
        q.eq("entity", "job").eq("entityId", jobId)
      )
      .order("desc")
      .collect();
  },
});
 