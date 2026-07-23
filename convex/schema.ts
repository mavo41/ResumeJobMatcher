// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    userId: v.string(),
    clerkId: v.string(),
    Image: v.string(),
     role: v.union(v.literal("user"), v.literal("employer"), v.literal("admin")),
    companyName: v.optional(v.string()),
    createdAt: v.optional(v.number()),  
   updatedAt: v.optional(v.number()),
  }).index("by_clerkId", ["clerkId"])
  .index("by_userId", ["userId"]),

   employers: defineTable({
      userId: v.string(), // Links to users table
      companyName: v.string(),
      website: v.optional(v.string()),
      industry: v.optional(v.string()),
      size: v.optional(v.string()),
      description: v.optional(v.string()),
      location: v.optional(v.string()),
      logoFileId: v.optional(v.id("_storage")), // storage for logo
      verified: v.boolean(), // Verification status
      phone: v.optional(v.string()),
    }).index("by_userId", ["userId"]),

  settings: defineTable({
  userId: v.string(),
  notificationPreferences: v.object({
    newApplications: v.boolean(),
    interviewReminders: v.boolean(),
    candidateMessages: v.boolean(),
    jobExpirations: v.boolean(),
    marketingUpdates: v.boolean(),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_userId", ["userId"]),
  
notifications: defineTable({
  userId: v.string(), // The user who receives the notification
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
  read: v.boolean(),
  createdAt: v.number(),
  metadata: v.optional(v.any()),
}).index("by_userId", ["userId"])
  .index("by_userId_read", ["userId", "read"]),


    // AI Analysis results
   aiAnalyses: defineTable({
    employerId: v.string(),
    jobId: v.optional(v.id("jobs")),
    candidateId: v.optional(v.string()),
    type: v.union(
      v.literal("candidate_explanation"),
      v.literal("match_analysis"),
      v.literal("bias_detection"),
      v.literal("interview_recommendation"),
      v.literal("skill_gap"),
      v.literal("hiring_insight"),
      v.literal("comparison"),        // NEW: For multi-candidate comparison
      v.literal("funnel_analytics"),  // NEW: For hiring funnel
    ),
    result: v.any(), // JSON result from AI
    score: v.optional(v.number()),
    confidence: v.optional(v.number()), // NEW: AI confidence score
    risk: v.optional(v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH")
    )),
    riskReason: v.optional(v.string()),
    recommendations: v.optional(v.array(v.string())),
    categoryScores: v.optional(v.object({
      skills: v.optional(v.number()),
      experience: v.optional(v.number()),
      projects: v.optional(v.number()),
      education: v.optional(v.number()),
      certifications: v.optional(v.number()),
      softSkills: v.optional(v.number()),
    })),
    categoryReasoning: v.optional(v.object({
      skills: v.optional(v.string()),
      experience: v.optional(v.string()),
      projects: v.optional(v.string()),
      education: v.optional(v.string()),
      certifications: v.optional(v.string()),
      softSkills: v.optional(v.string()),
    })),
    biasScore: v.optional(v.number()),
    biasIssues: v.optional(v.array(v.object({
      type: v.string(),
      severity: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
      suggestion: v.string(),
    }))),
    anonymizedResume: v.optional(v.string()), // NEW: Store anonymized version
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_employerId", ["employerId"])
    .index("by_employerId_type", ["employerId", "type"])
    .index("by_candidateId", ["candidateId"]),

  // AI Assistant conversations
 aiConversations: defineTable({
    employerId: v.string(),
    jobId: v.optional(v.id("jobs")),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
      content: v.string(),
      timestamp: v.number(),
      metadata: v.optional(v.object({
        candidateId: v.optional(v.string()),
        action: v.optional(v.string()),
      })),
    })),
    context: v.optional(v.object({
      jobId: v.optional(v.id("jobs")),
      candidateIds: v.optional(v.array(v.string())),
      filters: v.optional(v.object({
        status: v.optional(v.string()),
        skills: v.optional(v.array(v.string())),
      })),
    })),
    summary: v.optional(v.string()), // NEW: Conversation summary
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_employerId", ["employerId"])
    .index("by_employerId_updated", ["employerId", "updatedAt"]),


    //Hiring Insights
    hiringInsights: defineTable({
        employerId: v.string(),
        jobId: v.optional(v.id("jobs")),
        generatedAt: v.number(),
        period: v.union(
          v.literal("daily"),
          v.literal("weekly"),
          v.literal("monthly")
        ),
        metrics: v.object({
          totalApplicants: v.number(),
          newApplicants: v.optional(v.number()),
          interviewReady: v.number(),
          topMatch: v.number(),
          averageScore: v.optional(v.number()),
          timeToHire: v.optional(v.number()),
          conversionRate: v.optional(v.number()),
        }),
        topCandidates: v.array(v.object({
          candidateId: v.string(),
          name: v.string(),
          matchScore: v.number(),
          reason: v.string(),
        })),
        skillGaps: v.array(v.object({
          skill: v.string(),
          percentage: v.number(),
          severity: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
        })),
        recommendations: v.array(v.string()),
        trends: v.optional(v.object({
          applications: v.array(v.object({
            date: v.string(),
            count: v.number(),
          })),
          averageScore: v.array(v.object({
            date: v.string(),
            score: v.number(),
          })),
        })),
      }).index("by_employerId", ["employerId"])
        .index("by_employerId_job", ["employerId", "jobId"])
        .index("by_generatedAt", ["generatedAt"]),
    

        //Blind resumes
         blindResumes: defineTable({
    candidateId: v.string(),
    employerId: v.string(),
    jobId: v.optional(v.id("jobs")),
    originalHash: v.string(), // Hash of original resume for deduplication
    anonymizedText: v.string(),
    removedFields: v.array(v.object({
      type: v.union(
        v.literal("name"),
        v.literal("email"),
        v.literal("phone"),
        v.literal("address"),
        v.literal("gender"),
        v.literal("age"),
        v.literal("religion"),
        v.literal("nationality"),
        v.literal("photo"),
      ),
      originalValue: v.optional(v.string()),
      replacement: v.string(),
    })),
    biasScore: v.number(),
    biasIssues: v.array(v.object({
      type: v.string(),
      severity: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
      suggestion: v.string(),
    })),
    processedAt: v.number(),
    expiresAt: v.optional(v.number()), // For data retention
  }).index("by_candidateId", ["candidateId"])
    .index("by_employerId", ["employerId"])
    .index("by_processedAt", ["processedAt"]),


    //multi candidate comparison results
     comparisons: defineTable({
        employerId: v.string(),
        jobId: v.optional(v.id("jobs")),
        candidateIds: v.array(v.string()),
        rankings: v.array(v.object({
          candidateId: v.string(),
          rank: v.number(),
          score: v.number(),
          recommendation: v.string(),
          strengths: v.array(v.string()),
          weaknesses: v.array(v.string()),
        })),
        insights: v.object({
          topSkill: v.string(),
          missingSkill: v.string(),
          averageScore: v.number(),
          totalCandidates: v.number(),
          distribution: v.optional(v.object({
            top: v.number(),
            middle: v.number(),
            bottom: v.number(),
          })),
        }),
        createdAt: v.number(),
      }).index("by_employerId", ["employerId"])
        .index("by_employerId_job", ["employerId", "jobId"]),
    

        //Hiring funnels
         funnelAnalytics: defineTable({
    employerId: v.string(),
    jobId: v.optional(v.id("jobs")),
    date: v.string(), // YYYY-MM-DD
    stages: v.object({
      sourced: v.number(),
      applied: v.number(),
      reviewed: v.number(),
      shortlisted: v.number(),
      interviewing: v.number(),
      offer: v.number(),
      hired: v.number(),
      rejected: v.number(),
    }),
    conversionRates: v.object({
      appliedToInterview: v.optional(v.number()),
      interviewToOffer: v.optional(v.number()),
      offerToHired: v.optional(v.number()),
      overall: v.optional(v.number()),
    }),
    timeMetrics: v.optional(v.object({
      avgTimeToReview: v.optional(v.number()),
      avgTimeToInterview: v.optional(v.number()),
      avgTimeToHire: v.optional(v.number()),
    })),
    createdAt: v.number(),
  }).index("by_employerId", ["employerId"])
    .index("by_employerId_date", ["employerId", "date"])
    .index("by_jobId", ["jobId"]),

    //Slill gap analytics

    skillGapAnalytics: defineTable({
    employerId: v.string(),
    jobId: v.optional(v.id("jobs")),
    analyzedAt: v.number(),
    requiredSkills: v.array(v.object({
      skill: v.string(),
      importance: v.union(v.literal("critical"), v.literal("preferred"), v.literal("nice_to_have")),
    })),
    availableSkills: v.array(v.object({
      skill: v.string(),
      count: v.number(),
      percentage: v.number(),
    })),
    gaps: v.array(v.object({
      skill: v.string(),
      severity: v.union(v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW")),
      missingCount: v.number(),
      recommendation: v.string(),
    })),
    marketInsights: v.optional(v.object({
      skillDemand: v.array(v.object({
        skill: v.string(),
        demandScore: v.number(),
      })),
      salaryRange: v.optional(v.object({
        min: v.number(),
        max: v.number(),
        average: v.number(),
      })),
    })),
    recommendations: v.array(v.string()),
  }).index("by_employerId", ["employerId"])
    .index("by_employerId_job", ["employerId", "jobId"]),

 
    
feedbackOutcomes: defineTable({
  candidateId: v.string(),
  employerId: v.string(),
  score: v.number(),
  breakdown: v.object({
    skills: v.number(),
    experience: v.number(),
    education: v.number(),
    projects: v.number(),
    certifications: v.number(),
    achievements: v.number(),
  }),
  interviewed: v.boolean(),
  hired: v.boolean(),
  rejected: v.boolean(),
  feedback: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_candidateId", ["candidateId"])
  .index("by_employerId", ["employerId"]),

modelWeights: defineTable({
  employerId: v.string(),
  weights: v.object({
    skills: v.number(),
    experience: v.number(),
    education: v.number(),
    projects: v.number(),
    certifications: v.number(),
    achievements: v.number(),
  }),
  updatedAt: v.number(),
  version: v.number(),
}).index("by_employerId", ["employerId"]),

// Vectors table for storing embeddings
vectors: defineTable({
  id: v.string(),
  embedding: v.array(v.number()),
  metadata: v.object({
    name: v.string(),
    skills: v.array(v.string()),
    experience: v.number(),
    candidateId: v.string(),
  }),
  experienceTier: v.optional(
    v.union(v.literal("junior"), v.literal("mid"), v.literal("senior"))
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_candidateId", ["metadata.candidateId"])
  .index("by_createdAt", ["createdAt"])
  .index("by_updatedAt", ["updatedAt"])
  .index("by_experienceTier", ["experienceTier"]),

// Embeddings cache table
embeddingsCache: defineTable({
  text: v.string(),
  embedding: v.array(v.number()),
  createdAt: v.number(),
  accessedAt: v.number(),
}).index("by_text", ["text"])
  .index("by_accessedAt", ["accessedAt"]),

    auditLogs: defineTable({
    actorId: v.string(),               // admin/user who performed action
    action: v.string(),                // e.g. CREATE_JOB, TAKEDOWN_JOB, RESTORE_JOB
    entity: v.string(),                // "job", "employer", etc
    entityId: v.string(),              // document _id as string
    metadata: v.optional(v.any()),     // flexible extra info
    createdAt: v.number(),
  })
  .index("by_entity", ["entity", "entityId"])
  .index("by_actor", ["actorId"]),
  


  resumes: defineTable({
  companyName: v.string(),
  jobTitle: v.string(),
  jobDescription: v.string(),
  fileStorageId: v.id("_storage"),

  feedback: v.optional(
    v.object({
      overallScore: v.number(),
      ATS: v.object({
        score: v.number(),
        tips: v.array(
          v.object({
             type: v.string(),
              tip: v.string(),
                    explanation: v.string(), 
 })),

      }),
      toneAndStyle: v.object({
        score: v.number(),
        tips: v.array(
          v.object({
            type: v.string(),
            tip: v.string(),
            explanation: v.string(),
          })
        ),
      }),
      content: v.object({
        score: v.number(),
        tips: v.array(
          v.object({
            type: v.string(),
            tip: v.string(),
            explanation: v.string(),
          })
        ),
      }),
      structure: v.object({
        score: v.number(),
        tips: v.array(
          v.object({
            type: v.string(),
            tip: v.string(),
            explanation: v.string(),
          })
        ),
      }),
      skills: v.object({
        score: v.number(),
        tips: v.array(
          v.object({
            type: v.string(),
            tip: v.string(),
            explanation: v.string(),
          })
        ),
      }),
    })
  ),

  analysisStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    analysisError: v.optional(v.string()),
    jobMatchScore: v.optional(v.number()),
    jobMatchBreakdown: v.optional(v.any()),


  createdAt: v.number(),
  updatedAt: v.number(),
  userId: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("archived"),
    v.literal("deleted")
  ),
}).index("by_userId", ["userId"]),

resumeAnalysisCache: defineTable({
    contentHash: v.string(),
    feedback: v.any(),
    createdAt: v.number(),
  }).index("by_contentHash", ["contentHash"]),
 
  //  Jobs table
  jobs: defineTable({
    employerId: v.optional(v.string()),
    userId: v.optional(v.string()),          // "system" or employer userId
    logoUrl: v.optional(v.id("_storage")),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    jobType: v.optional(v.string()),
    postedAt: v.number(),
    description: v.string(),
    requirements: v.optional(v.array(v.string())),
    salaryRange: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("draft")
    ),
     tag: v.optional(v.union(v.literal("MATCH"), v.literal("RECOMMENDED"))),
    createdAt: v.number(),
    updatedAt: v.number(),
    isRemoved: v.optional(v.boolean()),               // soft delete flag
    removedAt: v.optional(v.number()),    // timestamp
    removedBy: v.optional(v.string()),    // admin userId
    removalReason: v.optional(v.string()),// moderation reason
    source: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
  // Incremented once per job-detail-page view (see job/[jobId]/page.tsx).
    //views: v.optional(v.number()),


  }).index("by_status", ["status"])
  .index("by_employerId", ["employerId"])
  .index("by_status_removed", ["status", "isRemoved"])
  .index("by_employer_title_company_location", ["employerId", "title", "company", "location"]),


  jobViews: defineTable({
    jobId: v.id("jobs"),
    viewerId: v.string(), // Clerk userId, or an anonymous session id
    firstViewedAt: v.number(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_jobId_viewerId", ["jobId", "viewerId"]),

  //Applications table
  applications: defineTable({
    userId: v.string(),
    jobId: v.id("jobs"),
    employerId: v.optional(v.string()),

    status: v.union(
      v.literal("shortlisted"),
      v.literal("applied"),
      v.literal("interviewing"),
      v.literal("offer"),
      v.literal("rejected"),
      v.literal("accepted"),
      v.literal("reviewed"),
    ),
    notes: v.optional(v.string()),
    savedAt: v.number(),
    updatedAt: v.number(),
    matchScore: v.optional(v.number()),
  candidateName: v.optional(v.string()),
  candidateEmail: v.optional(v.string()),
  candidatePhone: v.optional(v.string()),
  candidateLocation: v.optional(v.string()),
  skills: v.optional(v.array(v.string())),
  experience: v.optional(v.number()),
  resumeFileId: v.optional(v.id("_storage")),
  submitted: v.optional(v.boolean()),
  duplicateAttempts: v.optional(v.number()),
  hiredAt: v.optional(v.number()),
  analysisStatus: v.optional(
    v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    )
  ),
  analysisError: v.optional(v.string()),
  analysisSummary: v.optional(
    v.object({
      risk: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
      confidence: v.number(),
      recommendation: v.string(),
      topStrengths: v.array(v.string()),
      topWeaknesses: v.array(v.string()),
    })
  ),


  })
    .index("by_userId", ["userId"])
    .index("by_jobId", ["jobId"])
    .index("by_employerId", ["employerId"])
    .index("by_userId_jobId", ["userId", "jobId"]),

   
   
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

  conversations: defineTable({
  employerId: v.string(),
  candidateUserId: v.string(),
  applicationId: v.id("applications"),
  jobId: v.id("jobs"),
  lastMessageAt: v.number(),
  lastMessagePreview: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_employerId", ["employerId"])
  .index("by_candidateUserId", ["candidateUserId"])
  .index("by_applicationId", ["applicationId"]),

chatMessages: defineTable({
  conversationId: v.id("conversations"),
  senderId: v.string(),
  senderRole: v.union(v.literal("employer"), v.literal("candidate"), v.literal("system")),
  content: v.string(),
  read: v.boolean(),
  createdAt: v.number(),
}).index("by_conversationId", ["conversationId"]),

interviews: defineTable({
  applicationId: v.id("applications"),
  conversationId: v.id("conversations"),
  employerId: v.string(),
  candidateUserId: v.string(),
  jobId: v.id("jobs"),
  scheduledAt: v.number(),
  mode: v.union(v.literal("ONSITE"), v.literal("ONLINE")),
  locationOrLink: v.string(),
  status: v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled")),
  createdAt: v.number(),
})
  .index("by_applicationId", ["applicationId"])
  .index("by_employerId", ["employerId"])
  .index("by_candidateUserId", ["candidateUserId"]),

});




