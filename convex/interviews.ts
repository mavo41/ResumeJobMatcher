import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const scheduleInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    conversationId: v.id("conversations"),
    employerId: v.string(),
    candidateUserId: v.string(),
    jobId: v.id("jobs"),
    scheduledAt: v.number(),
    mode: v.union(v.literal("ONSITE"), v.literal("ONLINE")),
    locationOrLink: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.employerId) throw new Error("Unauthorized");

    const now = Date.now();
    const interviewId = await ctx.db.insert("interviews", { ...args, status: "scheduled", createdAt: now });

    await ctx.db.insert("chatMessages", {
      conversationId: args.conversationId,
      senderId: args.employerId,
      senderRole: "system",
      content: `📅 Interview scheduled for ${new Date(args.scheduledAt).toLocaleString()} (${args.mode}) — ${args.locationOrLink}`,
      read: false,
      createdAt: now,
    });
    await ctx.db.patch(args.conversationId, { lastMessageAt: now, lastMessagePreview: "Interview scheduled" });
    await ctx.db.patch(args.applicationId, { status: "interviewing", updatedAt: now });

     await ctx.db.insert("notifications", {
      userId: args.candidateUserId,
      type: "interview_reminder",
      title: "Interview Scheduled",
      message: `Your interview is scheduled for ${new Date(args.scheduledAt).toLocaleString()} (${args.mode}).`,
      link: `/messages?conversationId=${args.conversationId}`,
      read: false,
      createdAt: now,
    });

    return interviewId;
  },
});

export const getInterviewForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const all = await ctx.db.query("interviews").collect();
    return all.filter((i) => i.conversationId === conversationId).sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  },
});

export const getUpcomingInterviews = query({
  args: { employerId: v.string() },
  handler: async (ctx, { employerId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== employerId) throw new Error("Unauthorized");

    const now = Date.now();
    const all = await ctx.db
      .query("interviews")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .collect();

    const upcoming = all
      .filter((i) => i.scheduledAt > now && i.status === "scheduled")
      .sort((a, b) => a.scheduledAt - b.scheduledAt);

    return await Promise.all(
      upcoming.map(async (i) => {
        const application = await ctx.db.get(i.applicationId);
        const job = await ctx.db.get(i.jobId);
        return {
          ...i,
          candidateName: application?.candidateName || "Candidate",
          jobTitle: job?.title || "Unknown Position",
        };
      })
    );
  },
});