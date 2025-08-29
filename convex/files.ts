// convex/files.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveFile = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    size: v.number(),
    type: v.string(),
    uploadedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("files", {
      name: args.name,
      size: args.size,
      type: args.type,
      uploadedAt: args.uploadedAt,
    });
  },
});
