// convex/vectors.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Upsert a vector
export const upsert = mutation({
  args: {
    id: v.string(),
    embedding: v.array(v.number()),
    metadata: v.object({
      name: v.string(),
      skills: v.array(v.string()),
      experience: v.number(),
      candidateId: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vectors")
      .withIndex("by_candidateId", (q) => q.eq("metadata.candidateId", args.metadata.candidateId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        metadata: args.metadata,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("vectors", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Search for similar vectors
export const search = query({
  args: {
    embedding: v.array(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { embedding, limit = 10 }) => {
    const vectors = await ctx.db.query("vectors").collect();
    
    const scored = vectors.map((vec) => ({
      id: vec.id,
      metadata: vec.metadata,
      similarity: cosineSimilarity(embedding, vec.embedding),
    }));

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  },
});

// Find similar candidates
export const findSimilar = query({
  args: {
    candidateId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { candidateId, limit = 5 }) => {
    const candidateVector = await ctx.db
      .query("vectors")
      .withIndex("by_candidateId", (q) => q.eq("metadata.candidateId", candidateId))
      .first();

    if (!candidateVector) {
      return [];
    }

    const vectors = await ctx.db
      .query("vectors")
      .filter((q) => q.neq(q.field("metadata.candidateId"), candidateId))
      .collect();

    const scored = vectors.map((vec) => ({
      id: vec.id,
      metadata: vec.metadata,
      similarity: cosineSimilarity(candidateVector.embedding, vec.embedding),
    }));

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  },
});

// Helper: Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}