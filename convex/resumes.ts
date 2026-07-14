// convex/resumes.ts
import { mutation, internalMutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// 1) Client asks for an upload URL, then posts the file directly to Convex storage.
export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const url = await ctx.storage.generateUploadUrl();
  return url;
});

// 2) Create a resume record after you have storageId.
export const createResume = mutation({
  args: {
    companyName: v.string(),
    jobTitle: v.string(),
    jobDescription: v.string(),
    fileStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {

    // user identity
     const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: must be logged in to upload a resume");
    }
    const userId = identity.subject; // Clerk user ID

    const now = Date.now();

    const id = await ctx.db.insert("resumes", {
      companyName: args.companyName,
      jobTitle: args.jobTitle,
      jobDescription: args.jobDescription,
      fileStorageId: args.fileStorageId,
      feedback: undefined,
      analysisStatus: "pending",
      analysisError: undefined,
      createdAt: now,
      updatedAt: now,
      userId, // Clerk user ID
      status: "active",
    });
    return id; 
  },
});

// 3) Update feedback after your AI returns a result.
export const updateResumeFeedback = mutation({
  args: {
    id: v.id("resumes"),
    feedback: v.any(),
  },
  handler: async (ctx, { id, feedback }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: No user logged in");
    }

    const resume = await ctx.db.get(id);
    if (!resume) {
      throw new Error("Resume not found");
    }

    // ✅ Only the owner can update their resume feedback
    if (resume.userId !== identity.subject) {
      console.error(`User ${identity.subject} tried to update resume ${id} owned by ${resume.userId}`);
      throw new Error("Forbidden: You don't own this resume");
    }

    await ctx.db.patch(id, { 
      feedback, 
      updatedAt: Date.now() 
    });
  },
});

// 4) Action to get a temporary, signed URL to download the stored file.
export const getFileUrl = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    // IMPORTANT: For now, we're removing the auth check
    // In production, you should add proper authorization
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Unauthorized");
    
    try {
      const url = await ctx.storage.getUrl(storageId);
      return url; // null if not found
    } catch (err) {
      console.error("Error fetching file from Convex storage:", err);
      throw new Error("Failed to retrieve file from storage");
    }
  },
});

// 5) Query to fetch resume
export const getResume = query({
  args: { id: v.id("resumes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const doc = await ctx.db.get(id);
    if (!doc) return null;

    if (doc.userId !== identity.subject) return null;

    return doc;

  },
});

// 6) List all resumes for current user 
export const getMyResumes  = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("status"), "active"))   // only active
      .order("desc")
      .collect();
  },
});

// 7)  archive resumes instead of delete
export const archiveResume = mutation({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.resumeId, { status: "archived", updatedAt: Date.now() });
  return true;
},
});

// 8) list all archived resumes for current user
export const getArchivedResumes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("status"), "archived")) // ✅ only archived
      .order("desc")
      .collect();
  },
});

// get user resumes
export const getUserResume = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

//upload resume to employer dashboard
export const uploadResume = mutation({
  args: {
    userId: v.string(),
    fileStorageId: v.id("_storage"),
    jobTitle: v.optional(v.string()),
    companyName: v.optional(v.string()),
    jobDescription: v.optional(v.string()), // ADD THIS
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("resumes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fileStorageId: args.fileStorageId,
        jobTitle: args.jobTitle || existing.jobTitle,
        companyName: args.companyName || existing.companyName,
        jobDescription: args.jobDescription || existing.jobDescription || "",
        updatedAt: now,
        status: "active",
        analysisStatus: "pending",
        analysisError: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("resumes", {
      userId: args.userId,
      fileStorageId: args.fileStorageId,
      jobTitle: args.jobTitle || "",
      companyName: args.companyName || "",
      jobDescription: args.jobDescription || "",
      createdAt: now,
      updatedAt: now,
      status: "active",
      analysisStatus: "pending",
        analysisError: undefined,
    });
  },
});


// 9) completely delete the resume 
export const deleteResume = mutation({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== identity.subject) {
      throw new Error("Forbidden");
    }
// soft delete
     await ctx.db.patch(args.resumeId, { status: "deleted", updatedAt: Date.now() });

// hard delete instead:

    // await ctx.db.delete(args.resumeId);
        return true;

  },
});

// 10) Schedule background analysis (Issue #2). This mutation is fast —
// it only verifies ownership, resets status, and enqueues the actual
// work via the scheduler. It returns almost immediately.
export const scheduleAnalysis = mutation({
  args: {
    resumeId: v.id("resumes"),
    fileStorageId: v.id("_storage"),
    jobTitle: v.string(),
    jobDescription: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const resume = await ctx.db.get(args.resumeId);
    if (!resume || resume.userId !== identity.subject) {
      throw new Error("Forbidden: You don't own this resume");
    }

    await ctx.db.patch(args.resumeId, {
      analysisStatus: "pending",
      analysisError: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.resumeAnalysis.analyzeResume, {
      resumeId: args.resumeId,
      fileStorageId: args.fileStorageId,
      jobTitle: args.jobTitle,
      jobDescription: args.jobDescription,
    });

    return { scheduled: true };
  },
});

// 11) Internal: mark analysis status/progress. Only callable from other
// Convex functions (the scheduled action) — never exposed to clients.
export const setAnalysisStatus = internalMutation({
  args: {
    resumeId: v.id("resumes"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { resumeId, status, error }) => {
    await ctx.db.patch(resumeId, {
      analysisStatus: status,
      analysisError: error,
      updatedAt: Date.now(),
    });
  },
});

// 12) Internal: persist the finished feedback and mark completed.
export const completeAnalysis = internalMutation({
  args: {
    resumeId: v.id("resumes"),
    feedback: v.any(),
  },
  handler: async (ctx, { resumeId, feedback }) => {
    await ctx.db.patch(resumeId, {
      feedback,
      analysisStatus: "completed",
      analysisError: undefined,
      updatedAt: Date.now(),
    });
  },
});