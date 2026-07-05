import { query } from "./_generated/server";

export const whoami = query(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return {
      status: "unauthenticated",
      message: "No user logged in",
    };
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_userId", (q) =>
      q.eq("userId", identity.subject)
    )
    .unique();

  return {
    status: "authenticated",
    userId: identity.subject,
    email: identity.email,
    role: user?.role ?? "user",
  };
});
