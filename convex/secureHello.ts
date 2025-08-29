import { query } from "./_generated/server";
import { v } from "convex/values";

export const secureHello = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return `Hello ${args.name}, you are signed in as ${identity.name ?? identity.email}`;
  },
});
