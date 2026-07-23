"use node";

import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { extractResumeText } from "../src/app/lib/pdfExtractor"  

export const getResumeTextForApplication = action({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const application = await ctx.runQuery(internal.applications.getApplicationInternal, { applicationId });
    if (!application) throw new Error("Application not found");
    if (application.employerId !== identity.subject) throw new Error("Forbidden");
    if (!application.resumeFileId) throw new Error("No resume file on this application");

    const url = await ctx.storage.getUrl(application.resumeFileId);
    if (!url) throw new Error("Resume file not found in storage");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch resume: ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    const buffer = await response.arrayBuffer();

    const extraction = await extractResumeText(buffer, contentType);
    if (!extraction.ok) throw new Error(extraction.error);

    return extraction.text;
  },
});