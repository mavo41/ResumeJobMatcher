import { query } from "./_generated/server";
//convex\authTest.ts
export const whoami = query(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return { status: "unauthenticated", message: "No user logged in" };
  }

  return {
    status: "authenticated",
    userId: identity.subject,  // Clerk user ID
    email: identity.email,
  };
});
