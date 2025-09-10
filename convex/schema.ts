// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(),
    clerkId: v.string(),
    Image: v.string()
  }).index("by_userId", ["userId"]),


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
    ), //  enum constraint
  })
  
  // Index to query resumes by user
    .index("by_userId", ["userId"]),

   files: defineTable({  
    name: v.string(),
    size: v.number(),
    type: v.string(),
    uploadedAt: v.string(),
  }),

 
  //  Jobs table
  jobs: defineTable({
    logoUrl: v.optional(v.string()),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    postedAt: v.number(),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("draft")
    ),
     tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
    userId: v.string(), // who inserted the job (system or user)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  //Applications table
  applications: defineTable({
    userId: v.string(),
    jobId: v.id("jobs"),
    status: v.union(
      v.literal("shortlisted"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offer"),
      v.literal("rejected"),
      v.literal("accepted")
    ),
    notes: v.optional(v.string()),
    savedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_jobId", ["jobId"]),

   
   
    // Job Source Logs (for caching / rate limiting)
  jobSourceLogs: defineTable({
    source: v.string(),    // "remoteok" | "remotive" | "greenhouse"
    lastFetched: v.number(),
    jobCount: v.number(),
  }).index("by_source", ["source"]),


   //  Greenhouse companies list (dynamic instead of hardcoding)

    greenhouseCompanies: defineTable({
    handle: v.string(),  // e.g. "openai"
    name: v.string(),    // e.g. "OpenAI"
    url: v.optional(v.string()),
    addedAt: v.number(), // timestamp in ms
  }),

  
  meta: defineTable({
    key: v.string(),       // e.g. "lastFetched"
    value: v.string(),     // generic stringified value
    updatedAt: v.number(), // timestamp in ms
  }),

    // light-weight logs of fetch runs
    jobFetchLogs: defineTable({
    count: v.number(),
    warnings: v.array(v.string()),
    timestamp: v.number(),
  }),

});




