// convex/feedback.ts
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";


export const recordOutcome = mutation({
  args: {
    candidateId: v.string(),
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("feedbackOutcomes", {
      ...args,
      employerId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const updateWeights = mutation({
  args: {
    weights: v.object({
      skills: v.number(),
      experience: v.number(),
      education: v.number(),
      projects: v.number(),
      certifications: v.number(),
      achievements: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("modelWeights")
      .withIndex("by_employerId", (q) => q.eq("employerId", identity.subject))
      .first();

    const data = {
      employerId: identity.subject,
      weights: args.weights,
      updatedAt: Date.now(),
      version: existing ? (existing.version || 0) + 1 : 1,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("modelWeights", data);
    }
  },
});

export const getWeights = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("modelWeights")
      .withIndex("by_employerId", (q) => q.eq("employerId", identity.subject))
      .first();
  },
});

// FeedbackLearning state loss fix 
const MIN_OUTCOMES_TO_LEARN = 20;
const MIN_HIRED_TO_LEARN = 10;

// Call this after every recordOutcome. Cheap — a single indexed query —
// and safe to call unconditionally; it internally decides whether
// enough real data exists to justify recalculating weights.
export const maybeUpdateWeightsFromOutcomes = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const employerId = identity.subject;

    const outcomes = await ctx.db
      .query("feedbackOutcomes")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .collect();

    if (outcomes.length < MIN_OUTCOMES_TO_LEARN) {
      return { triggered: false, reason: "not_enough_outcomes", count: outcomes.length };
    }

    const hired = outcomes.filter((o) => o.hired);
    const rejected = outcomes.filter((o) => o.rejected);

    if (hired.length < MIN_HIRED_TO_LEARN) {
      return { triggered: false, reason: "not_enough_hires", hiredCount: hired.length };
    }

    const average = (list: typeof outcomes) => {
      const sum = {
        skills: 0,
        experience: 0,
        education: 0,
        projects: 0,
        certifications: 0,
        achievements: 0,
      };
      for (const o of list) {
        sum.skills += o.breakdown.skills;
        sum.experience += o.breakdown.experience;
        sum.education += o.breakdown.education;
        sum.projects += o.breakdown.projects;
        sum.certifications += o.breakdown.certifications;
        sum.achievements += o.breakdown.achievements;
      }
      const n = list.length || 1;
      return {
        skills: sum.skills / n,
        experience: sum.experience / n,
        education: sum.education / n,
        projects: sum.projects / n,
        certifications: sum.certifications / n,
        achievements: sum.achievements / n,
      };
    };

    const hiredAvg = average(hired);
    const rejectedAvg = average(rejected);

    const categories = [
      "skills",
      "experience",
      "education",
      "projects",
      "certifications",
      "achievements",
    ] as const;

    const differences: Record<(typeof categories)[number], number> = {
      skills: 0,
      experience: 0,
      education: 0,
      projects: 0,
      certifications: 0,
      achievements: 0,
    };
    let totalDiff = 0;

    for (const key of categories) {
      const diff = Math.abs(hiredAvg[key] - (rejectedAvg[key] || 0));
      differences[key] = diff;
      totalDiff += diff;
    }

    if (totalDiff <= 20) {
      return { triggered: false, reason: "insufficient_signal", totalDiff };
    }

    const existing = await ctx.db
      .query("modelWeights")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .first();

    const currentWeights = existing?.weights ?? {
      skills: 0.35,
      experience: 0.25,
      education: 0.15,
      projects: 0.12,
      certifications: 0.08,
      achievements: 0.05,
    };

    const newWeightsRaw: Record<(typeof categories)[number], number> = {
      skills: 0,
      experience: 0,
      education: 0,
      projects: 0,
      certifications: 0,
      achievements: 0,
    };
    for (const key of categories) {
      newWeightsRaw[key] = currentWeights[key] + (differences[key] / totalDiff) * 0.1;
    }

    const sum = categories.reduce((s, key) => s + newWeightsRaw[key], 0);
    const normalizedWeights = {
      skills: newWeightsRaw.skills / sum,
      experience: newWeightsRaw.experience / sum,
      education: newWeightsRaw.education / sum,
      projects: newWeightsRaw.projects / sum,
      certifications: newWeightsRaw.certifications / sum,
      achievements: newWeightsRaw.achievements / sum,
    };

    const data = {
      employerId,
      weights: normalizedWeights,
      updatedAt: Date.now(),
      version: existing ? (existing.version || 0) + 1 : 1,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("modelWeights", data);
    }

    return { triggered: true, newWeights: normalizedWeights, outcomesConsidered: outcomes.length };
  },
});

export const recordOutcomeInternal = internalMutation({
  args: {
    employerId: v.string(),
    candidateId: v.string(),
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feedbackOutcomes", { ...args, createdAt: Date.now() });
  },
});

export const maybeUpdateWeightsForEmployer = internalMutation({
  args: { employerId: v.string() },
  handler: async (ctx, { employerId }) => {
   

    
    const outcomes = await ctx.db
      .query("feedbackOutcomes")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .collect();

    if (outcomes.length < MIN_OUTCOMES_TO_LEARN) return { triggered: false };
    const hired = outcomes.filter((o) => o.hired);
    const rejected = outcomes.filter((o) => o.rejected);
    if (hired.length < MIN_HIRED_TO_LEARN) return { triggered: false };

    // ... identical weight-computation body to the existing
    // maybeUpdateWeightsFromOutcomes — copy that logic here verbatim,
    // substituting the passed-in employerId for identity.subject.

     const average = (list: typeof outcomes) => {
          const sum = {
            skills: 0,
            experience: 0,
            education: 0,
            projects: 0,
            certifications: 0,
            achievements: 0,
          };
          for (const o of list) {
            sum.skills += o.breakdown.skills;
            sum.experience += o.breakdown.experience;
            sum.education += o.breakdown.education;
            sum.projects += o.breakdown.projects;
            sum.certifications += o.breakdown.certifications;
            sum.achievements += o.breakdown.achievements;
          }
          const n = list.length || 1;
          return {
            skills: sum.skills / n,
            experience: sum.experience / n,
            education: sum.education / n,
            projects: sum.projects / n,
            certifications: sum.certifications / n,
            achievements: sum.achievements / n,
          };
        };
    
        const hiredAvg = average(hired);
        const rejectedAvg = average(rejected);
    
        const categories = [
          "skills",
          "experience",
          "education",
          "projects",
          "certifications",
          "achievements",
        ] as const;
    
        const differences: Record<(typeof categories)[number], number> = {
          skills: 0,
          experience: 0,
          education: 0,
          projects: 0,
          certifications: 0,
          achievements: 0,
        };
        let totalDiff = 0;
    
        for (const key of categories) {
          const diff = Math.abs(hiredAvg[key] - (rejectedAvg[key] || 0));
          differences[key] = diff;
          totalDiff += diff;
        }
    
        if (totalDiff <= 20) {
          return { triggered: false, reason: "insufficient_signal", totalDiff };
        }
    
        const existing = await ctx.db
          .query("modelWeights")
          .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
          .first();
    
        const currentWeights = existing?.weights ?? {
          skills: 0.35,
          experience: 0.25,
          education: 0.15,
          projects: 0.12,
          certifications: 0.08,
          achievements: 0.05,
        };
    
        const newWeightsRaw: Record<(typeof categories)[number], number> = {
          skills: 0,
          experience: 0,
          education: 0,
          projects: 0,
          certifications: 0,
          achievements: 0,
        };
        for (const key of categories) {
          newWeightsRaw[key] = currentWeights[key] + (differences[key] / totalDiff) * 0.1;
        }
    
        const sum = categories.reduce((s, key) => s + newWeightsRaw[key], 0);
        const normalizedWeights = {
          skills: newWeightsRaw.skills / sum,
          experience: newWeightsRaw.experience / sum,
          education: newWeightsRaw.education / sum,
          projects: newWeightsRaw.projects / sum,
          certifications: newWeightsRaw.certifications / sum,
          achievements: newWeightsRaw.achievements / sum,
        };
    
        const data = {
          employerId,
          weights: normalizedWeights,
          updatedAt: Date.now(),
          version: existing ? (existing.version || 0) + 1 : 1,
        };
    
        if (existing) {
          await ctx.db.patch(existing._id, data);
        } else {
          await ctx.db.insert("modelWeights", data);
        }
    
        return { triggered: true, newWeights: normalizedWeights, outcomesConsidered: outcomes.length };
  },
});

