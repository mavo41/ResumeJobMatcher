// convex/migrations.ts
//
// One-off backfill mutations. Each is idempotent and safe to re-run —
// they only touch rows that still need fixing.

import { internalMutation } from "./_generated/server";

export const backfillApplicationEmployerId = internalMutation({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db.query("applications").collect();

    let updated = 0;
    let skippedNoJob = 0;

    for (const app of applications) {
      if (app.employerId !== undefined) {
        continue; // already backfilled
      }

      const job = await ctx.db.get(app.jobId);
      if (!job?.employerId) {
        skippedNoJob++;
        continue;
      }

      await ctx.db.patch(app._id, { employerId: job.employerId });
      updated++;
    }

    console.log(
      `[backfillApplicationEmployerId] Updated ${updated} rows, skipped ${skippedNoJob} (no matching job/employerId).`
    );

    return { updated, skippedNoJob, total: applications.length };
  },
});

export const backfillApplicationSubmittedFlag = internalMutation({
  args: {},
  handler: async (ctx) => {
    const applications = await ctx.db.query("applications").collect();
    let updated = 0;
    for (const app of applications) {
      if (app.submitted !== undefined) continue;
      // Heuristic: a resume file only ever gets attached via the real
      // apply flow (handleBookmark never sets resumeFileId), so its
      // presence disambiguates old "shortlisted" rows that were
      // actually real applications from genuine bookmarks.
      const submitted = app.status !== "shortlisted" || !!app.resumeFileId;
      await ctx.db.patch(app._id, { submitted, duplicateAttempts: app.duplicateAttempts ?? 0 });
      updated++;
    }
    return { updated, total: applications.length };
  },
});

export const stripLegacyJobViewsField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").collect();
    let cleaned = 0;
    for (const job of jobs) {
      if ("views" in job) {
        const { views, ...rest } = job as any;
        await ctx.db.replace(job._id, rest);
        cleaned++;
      }
    }
    return { cleaned, total: jobs.length };
  },
});