// convex/vectors.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const MAX_SCAN_ROWS = 2000;

function deriveExperienceTier(
  experience: number
): "junior" | "mid" | "senior" {
  if (experience < 3) return "junior";
  if (experience < 7) return "mid";
  return "senior";
}

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
    const experienceTier = deriveExperienceTier(args.metadata.experience);
    const existing = await ctx.db
      .query("vectors")
      .withIndex("by_candidateId", (q) => q.eq("metadata.candidateId", args.metadata.candidateId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        metadata: args.metadata,
        experienceTier,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("vectors", {
      ...args,
      experienceTier,
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
    experienceTier: v.optional(
      v.union(v.literal("junior"), v.literal("mid"), v.literal("senior"))
    ),
  },
  handler: async (ctx, { embedding, limit = 10, experienceTier }) => {
     let vectors;
    
        if (experienceTier) {
          vectors = await ctx.db
            .query("vectors")
            .withIndex("by_experienceTier", (q) =>
              q.eq("experienceTier", experienceTier)
            )
            .take(MAX_SCAN_ROWS);
        } else {
          vectors = await ctx.db.query("vectors").take(MAX_SCAN_ROWS + 1);
    
          if (vectors.length > MAX_SCAN_ROWS) {
            console.warn(
              `[vectors.search] Table has more than ${MAX_SCAN_ROWS} rows. ` +
                `Only the first ${MAX_SCAN_ROWS} were scanned — results may be ` +
                `incomplete. Consider passing an experienceTier filter, or ` +
                `migrating to a dedicated vector index (see Issue #3).`
            );
            vectors = vectors.slice(0, MAX_SCAN_ROWS);
          }
        }
    
        const scored = vectors.map((vec) => ({
          id: vec.id,
          metadata: vec.metadata,
          similarity: cosineSimilarity(embedding, vec.embedding),
        }));
    
        return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
      },
    });

// Find similar candidates
export const findSimilar = query({
  args: {
    candidateId: v.string(),
    limit: v.optional(v.number()),
    experienceTier: v.optional(
      v.union(v.literal("junior"), v.literal("mid"), v.literal("senior"))
    ),
  },
  handler: async (ctx, { candidateId, limit = 5, experienceTier }) => {
      const candidateVector = await ctx.db
        .query("vectors")
        .withIndex("by_candidateId", (q) => q.eq("metadata.candidateId", candidateId))
        .first();
  
      if (!candidateVector) {
        return [];
      }
  
      let vectors;
  
      if (experienceTier) {
        vectors = await ctx.db
          .query("vectors")
          .withIndex("by_experienceTier", (q) =>
            q.eq("experienceTier", experienceTier)
          )
          .filter((q) => q.neq(q.field("metadata.candidateId"), candidateId))
          .take(MAX_SCAN_ROWS);
      } else {
        vectors = await ctx.db
          .query("vectors")
          .filter((q) => q.neq(q.field("metadata.candidateId"), candidateId))
          .take(MAX_SCAN_ROWS + 1);
  
        if (vectors.length > MAX_SCAN_ROWS) {
          console.warn(
            `[vectors.findSimilar] Table has more than ${MAX_SCAN_ROWS} rows. ` +
              `Only the first ${MAX_SCAN_ROWS} were scanned — results may be ` +
              `incomplete. Consider passing an experienceTier filter, or ` +
              `migrating to a dedicated vector index (see Issue #3).`
          );
          vectors = vectors.slice(0, MAX_SCAN_ROWS);
        }
      }
  
      const scored = vectors.map((vec) => ({
        id: vec.id,
        metadata: vec.metadata,
        similarity: cosineSimilarity(candidateVector.embedding, vec.embedding),
      }));
  
      return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    },
  });