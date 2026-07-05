// convex/ai.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get AI analysis for a specific type
export const getAIAnalysis = query({
  args: {
    employerId: v.string(),
    type: v.union(
      v.literal("candidate_explanation"),
      v.literal("match_analysis"),
      v.literal("bias_detection"),
      v.literal("interview_recommendation"),
      v.literal("skill_gap"),
      v.literal("hiring_insight"),
      v.literal("comparison"),
      v.literal("funnel_analytics"),
    ),
    jobId: v.optional(v.id("jobs")),
    candidateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let queryBuilder = ctx.db
      .query("aiAnalyses")
      .withIndex("by_employerId_type", (q) => 
        q.eq("employerId", args.employerId).eq("type", args.type)
      );
    
    if (args.jobId) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("jobId"), args.jobId));
    }
    if (args.candidateId) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("candidateId"), args.candidateId));
    }
    
    return await queryBuilder.order("desc").first();
  },
});

// Get all AI analyses for an employer
export const getAIAnalyses = query({
  args: { employerId: v.string() },
  handler: async (ctx, { employerId }) => {
    return await ctx.db
      .query("aiAnalyses")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .order("desc")
      .collect();
  },
});

// Save AI analysis
export const saveAIAnalysis = mutation({
  args: {
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
      v.literal("comparison"),
      v.literal("funnel_analytics"),
    ),
    result: v.any(),
    score: v.optional(v.number()),
    confidence: v.optional(v.number()),
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
    anonymizedResume: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if analysis already exists
    const existing = await ctx.db
      .query("aiAnalyses")
      .withIndex("by_employerId_type", (q) => 
        q.eq("employerId", args.employerId).eq("type", args.type)
      )
      .filter((q) => {
        if (args.jobId) {
          return q.eq(q.field("jobId"), args.jobId);
        }
        return q.eq(q.field("jobId"), null);
      })
      .first();

    const data = {
      ...args,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("aiAnalyses", {
      ...data,
      createdAt: Date.now(),
    });
  },
});

// Process resume blindly (remove PII)
export const processResumeBlind = mutation({
  args: {
    resumeText: v.string(),
    candidateId: v.string(),
    employerId: v.string(),
    jobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    // Simple PII removal (in production, use regex or AI)
    const removedFields = [];
    let anonymizedText = args.resumeText;

    // Remove names (simple pattern)
    const nameMatch = anonymizedText.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/);
    if (nameMatch) {
      removedFields.push({
        type: "name" as const,
        originalValue: nameMatch[0],
        replacement: "[NAME]",
      });
      anonymizedText = anonymizedText.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[NAME]");
    }

    // Remove emails
    const emailMatch = anonymizedText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    if (emailMatch) {
      removedFields.push({
        type: "email" as const,
        originalValue: emailMatch[0],
        replacement: "[EMAIL]",
      });
      anonymizedText = anonymizedText.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]");
    }

    // Remove phone numbers
    const phoneMatch = anonymizedText.match(/\b\d{10,11}\b/);
    if (phoneMatch) {
      removedFields.push({
        type: "phone" as const,
        originalValue: phoneMatch[0],
        replacement: "[PHONE]",
      });
      anonymizedText = anonymizedText.replace(/\b\d{10,11}\b/g, "[PHONE]");
    }

    // Remove gender indicators
    const genderMatch = anonymizedText.match(/\b(?:Male|Female|Non-binary|M|F)\b/gi);
    if (genderMatch) {
      removedFields.push({
        type: "gender" as const,
        originalValue: genderMatch[0],
        replacement: "[GENDER]",
      });
      anonymizedText = anonymizedText.replace(/\b(?:Male|Female|Non-binary|M|F)\b/gi, "[GENDER]");
    }

    // Calculate bias score (simplified)
    const biasScore = Math.min(removedFields.length * 5, 100);
    const biasIssues = removedFields.map(f => ({
      type: `Potential ${f.type} bias`,
      severity: "MEDIUM" as const,
      suggestion: `Remove ${f.type} information from resumes`,
    }));

    // Save to blindResumes table
    const blindResumeId = await ctx.db.insert("blindResumes", {
      candidateId: args.candidateId,
      employerId: args.employerId,
      jobId: args.jobId,
      originalHash: Buffer.from(args.resumeText.substring(0, 100)).toString('base64'),
      anonymizedText,
      removedFields: removedFields.map(f => ({
        type: f.type,
        originalValue: f.originalValue,
        replacement: f.replacement,
      })),
      biasScore,
      biasIssues,
      processedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      anonymized: anonymizedText,
      removedFields,
      biasScore,
      biasIssues,
      blindResumeId,
    };
  },
});

//Save comparison results
export const saveComparison = mutation({
  args: {
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
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("comparisons", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Get recent comparisons
export const getRecentComparisons = query({
  args: { employerId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { employerId, limit = 10 }) => {
    return await ctx.db
      .query("comparisons")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .order("desc")
      .take(limit);
  },
});

export const getHiringFunnel = query({
  args: {
    userId: v.string(),
    jobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, { userId, jobId }) => {
    // Get all applications for this employer
    let applications = await ctx.db
      .query("applications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // If jobId is provided, filter by job
    if (jobId) {
      applications = applications.filter((app) => app.jobId === jobId);
    }

    // Count by status
    const stages = {
      sourced: applications.length,
      applied: applications.filter((a) => a.status === "applied").length,
      reviewed: applications.filter((a) => a.status === "reviewed").length,
      shortlisted: applications.filter((a) => a.status === "shortlisted").length,
      interviewing: applications.filter((a) => a.status === "interviewing").length,
      offer: applications.filter((a) => a.status === "offer").length,
      hired: applications.filter((a) => a.status === "accepted").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };

    return stages;
  },
});

// Get hiring insights
export const getHiringInsights = query({
  args: { 
    userId: v.string(), 
    jobId: v.optional(v.id("jobs")) 
  },
  handler: async (ctx, { userId, jobId }) => {
    // Get all insights for this employer
    const insights = await ctx.db
      .query("hiringInsights")
      .withIndex("by_employerId", (q) => q.eq("employerId", userId))
      .collect();
    
    // Filter by jobId if provided
    let filteredInsights = insights;
    if (jobId) {
      filteredInsights = insights.filter((insight) => insight.jobId === jobId);
    }
    
    // Return the most recent insight, or null if none exist
    if (filteredInsights.length === 0) {
      return null;
    }
    
    // Sort by generatedAt descending and return the first one
    return filteredInsights.sort((a, b) => b.generatedAt - a.generatedAt)[0];
  },
});

// Generate hiring insights (background job)
export const generateHiringInsights = mutation({
  args: {
    employerId: v.string(),
    jobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, { employerId, jobId }) => {
    // Fetch all applications for this employer
    let applications = await ctx.db
      .query("applications")
      .withIndex("by_userId", (q) => q.eq("userId", employerId))
      .collect();

    // If jobId is provided, filter by job
    if (jobId) {
      applications = applications.filter((app) => app.jobId === jobId);
    }

    // Get candidate data from users table or from applications
    const candidates = await Promise.all(
      applications.map(async (app) => {
        // Try to get user data
        const user = await ctx.db
          .query("users")
          .withIndex("by_userId", (q) => q.eq("userId", app.userId))
          .unique();
        
        return {
          _id: app._id,
          userId: app.userId,
          status: app.status,
          matchScore: (app as any).matchScore || 0,
          candidateName: user?.name || "Candidate",
          skills: (user as any)?.skills || [],
        };
      })
    );

    // Calculate metrics
    const totalApplicants = candidates.length;
    const interviewReady = candidates.filter(c => 
      c.status === "shortlisted" || c.status === "interviewing"
    ).length;
    const topMatch = candidates.length > 0 
      ? Math.max(...candidates.map(c => c.matchScore || 0)) 
      : 0;

    // Calculate skill gaps
    const skillCounts: Record<string, number> = {};
    candidates.forEach(c => {
      (c.skills || []).forEach((skill: string) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const skillGaps = Object.entries(skillCounts)
      .map(([skill, count]) => ({
        skill,
        percentage: Math.round((count / Math.max(totalApplicants, 1)) * 100),
        severity: count < totalApplicants * 0.3 ? "HIGH" as const :
                  count < totalApplicants * 0.6 ? "MEDIUM" as const :
                  "LOW" as const,
      }))
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5);

    // Top candidates
    const topCandidates = candidates
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 3)
      .map(c => ({
        candidateId: c._id,
        name: c.candidateName || "Candidate",
        matchScore: c.matchScore || 0,
        reason: (c.matchScore || 0) > 80 ? "Strong match" :
                (c.matchScore || 0) > 60 ? "Good potential" :
                "Needs review",
      }));

    // Recommendations
    const recommendations = [];
    if (skillGaps.some(g => g.severity === "HIGH")) {
      recommendations.push("Consider adjusting job requirements to attract more qualified candidates");
    }
    if (topCandidates.length < 3 && totalApplicants > 0) {
      recommendations.push("Consider expanding your sourcing channels");
    }
    if (topMatch < 70 && totalApplicants > 0) {
      recommendations.push("Review job description for clarity and attractiveness");
    }
    if (totalApplicants === 0) {
      recommendations.push("No applications yet. Consider promoting your job posting.");
    }

    // Calculate average score
    const averageScore = candidates.length > 0 
      ? candidates.reduce((sum, c) => sum + (c.matchScore || 0), 0) / candidates.length 
      : 0;

    // Save insights
    const insightId = await ctx.db.insert("hiringInsights", {
      employerId,
      jobId,
      generatedAt: Date.now(),
      period: "daily",
      metrics: {
        totalApplicants,
        interviewReady,
        topMatch,
        averageScore: Math.round(averageScore),
      },
      topCandidates,
      skillGaps,
      recommendations: recommendations.length > 0 ? recommendations : ["No recommendations at this time"],
    });

    return insightId;
  },
});



// Get AI conversation
export const getAIConversation = query({
  args: { employerId: v.string() },
  handler: async (ctx, { employerId }) => {
    return await ctx.db
      .query("aiConversations")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .order("desc")
      .first();
  },
});

// Save AI conversation
export const saveAIConversation = mutation({
  args: {
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
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiConversations")
      .withIndex("by_employerId", (q) => q.eq("employerId", args.employerId))
      .first();

    const data = {
      ...args,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("aiConversations", {
      ...data,
      createdAt: Date.now(),
    });
  },
});