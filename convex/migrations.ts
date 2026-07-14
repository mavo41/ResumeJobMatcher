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