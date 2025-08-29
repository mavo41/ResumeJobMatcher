// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  resumes: defineTable({
    companyName: v.string(),
    jobTitle: v.string(),
    jobDescription: v.string(),
    // Convex storage references use the special table name "_storage"
    fileStorageId: v.id("_storage"),
    feedback: v.optional(v.object({
  overallScore: v.number(),
  ATS: v.object({
    score: v.number(),
    tips: v.array(v.object({ type: v.string(), tip: v.string() })),
  }),
  toneAndStyle: v.object({
    score: v.number(),
    tips: v.array(v.object({ type: v.string(), tip: v.string(), explanation: v.string() })),
  }),
  content: v.object({
    score: v.number(),
    tips: v.array(v.object({ type: v.string(), tip: v.string(), explanation: v.string() })),
  }),
  structure: v.object({
    score: v.number(),
    tips: v.array(v.object({ type: v.string(), tip: v.string(), explanation: v.string() })),
  }),
  skills: v.object({
    score: v.number(),
    tips: v.array(v.object({ type: v.string(), tip: v.string(), explanation: v.string() })),
  }),
})),
 // store JSON feedback
    createdAt: v.number(),         
    updatedAt: v.number(),
    userId: v.string(), // Clerk user ID
    status: v.union(
      v.literal("active"),
      v.literal("archived"),
      v.literal("deleted")
    ), // 👈 enum constraint
  })
  
  // Index to query resumes by user
    .index("by_userId", ["userId"]),

   files: defineTable({  
    name: v.string(),
    size: v.number(),
    type: v.string(),
    uploadedAt: v.string(),
  }),
});
