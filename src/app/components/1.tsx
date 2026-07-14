// Internal — only callable from the scheduled candidateScoring action.
// No identity check: the trust boundary here is "only reachable via
// internal.* from trusted server code," matching the pattern already
// established in convex/resumes.ts (Issue #2).
export const setApplicationAnalysisStatus = internalMutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { applicationId, status, error }) => {
    await ctx.db.patch(applicationId, {
      analysisStatus: status,
      analysisError: error,
      updatedAt: Date.now(),
    });
  },
});

export const setApplicationAnalysis = internalMutation({
  args: {
    applicationId: v.id("applications"),
    matchScore: v.number(),
    summary: v.object({
      risk: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
      confidence: v.number(),
      recommendation: v.string(),
      topStrengths: v.array(v.string()),
      topWeaknesses: v.array(v.string()),
    }),
  },
  handler: async (ctx, { applicationId, matchScore, summary }) => {
    await ctx.db.patch(applicationId, {
      matchScore,
      analysisSummary: summary,
      analysisStatus: "completed",
      analysisError: undefined,
      updatedAt: Date.now(),
    });
  },
});