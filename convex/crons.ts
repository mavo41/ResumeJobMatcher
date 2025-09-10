// convex/crons.ts
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Run the scheduled fetch every 6 hours (adjust schedule as needed)
crons.interval(
  "fetch-all-jobs",
  { hours: 6 },
  api.jobs.fetchAllSources
);

export default crons;
