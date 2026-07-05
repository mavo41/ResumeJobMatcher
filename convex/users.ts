import { mutation,internalMutation, query } from "./_generated/server";
import { v } from "convex/values";


export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const userAttributes = {
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username || "Anonymous",
      email: data.email_addresses?.[0]?.email_address || "",
      clerkId: data.id,
      userId: data.id,           
      Image: data.image_url || "",
      role: "user" as const,     // ← default role for every new user
    };

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", data.id))
      .unique();

    if (existing === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(existing._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkUserId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});



export const createUser = mutation({
  args: {
  userId: v.string(),
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    Image: v.string(),
    role: v.union(v.literal("user"), v.literal("employer"), v.literal("admin")),
    companyName: v.optional(v.string()),
    createdAt: v.number(),
    
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
      await ctx.db.insert("users", args);
    }
  },
});

export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    console.log("Getting user with userId:", userId);
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    console.log("Found user:", user);
    return user;
  },
});

export const syncUserWithRolePreservation = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    Image: v.string(),
  },
  handler: async (ctx, args) => {
    // Find existing user
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();

    if (existing) {
      // Update only non-role fields, preserve existing role
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        Image: args.Image,
        updatedAt: now,
      });
      
      console.log(`Updated user ${args.clerkId} while preserving role: ${existing.role}`);
    } else {
      // New user gets default 'user' role
      await ctx.db.insert("users", {
        userId: args.clerkId,
        name: args.name,
        email: args.email,
        clerkId: args.clerkId,
        Image: args.Image,
        role: "user", // Default role for new users
        createdAt: now,
        updatedAt: now,
      });
      
      console.log(`Created new user ${args.clerkId} with default role: user`);
    }
  },
});


export const syncUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    Image: v.string(),
    role: v.optional(v.union(v.literal("user"), v.literal("employer"), v.literal("admin"))), // Made optional
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        Image: args.Image,
        ...(args.companyName && { companyName: args.companyName }),
      });
    } else {
      await ctx.db.insert("users", {
        userId: args.userId,
        name: args.name,
        email: args.email,
        clerkId: args.clerkId,
        Image: args.Image,
        role: "user", // Default role for new users
        companyName: args.companyName,
      });
    }
  },
});


export const createOrUpdateEmployerProfile = mutation({
  args: {
    userId: v.string(),
    companyName: v.string(),
    website: v.optional(v.string()),
    logoFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!user || user.role !== "employer") {
      throw new Error("User must be an employer");
    }
    const existing = await ctx.db
      .query("employers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, verified: false });
    } else {
      await ctx.db.insert("employers", { ...args, verified: false });
    }
    // Update of user companyName for quick access
    await ctx.db.patch(user._id, { companyName: args.companyName });
  },
});

// Secure role upgrade mutation (requires current user or admin)
export const upgradeToEmployer = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Prevent downgrading admin
    if (user.role === "admin") {
      throw new Error("Cannot change admin role");
    }
    
    // Only upgrade from user to employer
    if (user.role !== "user") {
      throw new Error(`Cannot upgrade from ${user.role} to employer`);
    }
    
    await ctx.db.patch(user._id, { role: "employer" });
    
    // Log this action for audit
    await ctx.db.insert("auditLogs", {
      actorId: args.userId,
      action: "UPGRADE_TO_EMPLOYER",
      entity: "user",
      entityId: user._id,
      metadata: { previousRole: "user", newRole: "employer" },
      createdAt: Date.now(),
    });
    
    return { success: true, role: "employer" };
  },
});

// Admin-only role management
export const updateUserRole = mutation({
  args: {
    userId: v.string(),
    newRole: v.union(v.literal("user"), v.literal("employer"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    
    // Check if current user is admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Admin access required");
    }
    
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    
    if (!targetUser) {
      throw new Error("Target user not found");
    }
    
    await ctx.db.patch(targetUser._id, { role: args.newRole });
    
    // Log admin action
    await ctx.db.insert("auditLogs", {
      actorId: identity.subject,
      action: "ADMIN_ROLE_UPDATE",
      entity: "user",
      entityId: targetUser._id,
      metadata: { oldRole: targetUser.role, newRole: args.newRole },
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const updateUser = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    clerkId: v.string(),
    Image: v.optional(v.string()),
    role: v.optional(v.union(v.literal("user"), v.literal("employer"), v.literal("admin"))),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
      throw new Error("User not found");
    }

    const { userId, ...updates } = args;
    await ctx.db.patch(existing._id, updates);
  },
});
