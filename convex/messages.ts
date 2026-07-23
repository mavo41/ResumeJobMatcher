import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateConversation = mutation({
  args: {
    employerId: v.string(),
    candidateUserId: v.string(),
    applicationId: v.id("applications"),
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.employerId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_applicationId", (q) => q.eq("applicationId", args.applicationId))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("conversations", { ...args, lastMessageAt: now, lastMessagePreview: undefined, createdAt: now });
  },
});

export const getEmployerConversations = query({
  args: { employerId: v.string() },
  handler: async (ctx, { employerId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== employerId) throw new Error("Unauthorized");

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_employerId", (q) => q.eq("employerId", employerId))
      .order("desc")
      .collect();

    return await Promise.all(
      conversations.map(async (c) => {
        const application = await ctx.db.get(c.applicationId);
        const job = await ctx.db.get(c.jobId);
        const unread = await ctx.db
          .query("chatMessages")
          .withIndex("by_conversationId", (q) => q.eq("conversationId", c._id))
          .filter((q) => q.and(q.eq(q.field("read"), false), q.neq(q.field("senderRole"), "employer")))
          .collect();
        return { ...c, candidateName: application?.candidateName || "Candidate", jobTitle: job?.title || "Unknown Position", unreadCount: unread.length };
      })
    );
  },
});

export const getCandidateConversations = query({
  args: { candidateUserId: v.string() },
  handler: async (ctx, { candidateUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== candidateUserId) throw new Error("Unauthorized");

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_candidateUserId", (q) => q.eq("candidateUserId", candidateUserId))
      .order("desc")
      .collect();

    return await Promise.all(
      conversations.map(async (c) => {
        const job = await ctx.db.get(c.jobId);
        const unread = await ctx.db
          .query("chatMessages")
          .withIndex("by_conversationId", (q) => q.eq("conversationId", c._id))
          .filter((q) => q.and(q.eq(q.field("read"), false), q.neq(q.field("senderRole"), "candidate")))
          .collect();
        return { ...c, jobTitle: job?.title || "Unknown Position", company: job?.company || "", unreadCount: unread.length };
      })
    );
  },
});

export const getConversationMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return [];
    if (identity.subject !== conversation.employerId && identity.subject !== conversation.candidateUserId) {
      throw new Error("Forbidden");
    }
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
  },
});

export const sendMessage = mutation({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, { conversationId, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new Error("Conversation not found");

    let senderRole: "employer" | "candidate";
    if (identity.subject === conversation.employerId) senderRole = "employer";
    else if (identity.subject === conversation.candidateUserId) senderRole = "candidate";
    else throw new Error("Forbidden");

    const now = Date.now();
    await ctx.db.insert("chatMessages", { conversationId, senderId: identity.subject, senderRole, content: content.trim(), read: false, createdAt: now });
    await ctx.db.patch(conversationId, { lastMessageAt: now, lastMessagePreview: content.trim().slice(0, 100) });

    const recipientId = senderRole === "employer" ? conversation.candidateUserId : conversation.employerId;
    await ctx.db.insert("notifications", {
      userId: recipientId,
      type: "candidate_message",
      title: "New Message",
      message: content.trim().slice(0, 100),
      link: senderRole === "employer" ? `/messages?conversationId=${conversationId}` : `/employer/messages?conversationId=${conversationId}`,
      read: false,
      createdAt: now,
    });
},
});

export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return;
    const myRole = identity.subject === conversation.employerId ? "employer" : "candidate";
    const unread = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
      .filter((q) => q.and(q.eq(q.field("read"), false), q.neq(q.field("senderRole"), myRole)))
      .collect();
    await Promise.all(unread.map((m) => ctx.db.patch(m._id, { read: true })));
  },
});