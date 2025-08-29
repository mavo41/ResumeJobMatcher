// convex/resumes.ts
import { mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
    if (!identity) throw new Error("Unauthorized");

    const resume = await ctx.db.get(id);
    if (!resume) throw new Error("Resume not found");

    // ✅ Only the owner can update their resume feedback
    if (resume.userId !== identity.subject) {
      throw new Error("Forbidden: You don't own this resume");
    }

    await ctx.db.patch(id, { feedback, updatedAt: Date.now() });
  },
});

// 4) Action to get a temporary, signed URL to download the stored file.
export const getFileUrl = action({
  args: { storageId: v.id("_storage") }, 
  handler: async (ctx, { storageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
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