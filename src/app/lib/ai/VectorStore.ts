// lib/ai/VectorStore.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { SkillEmbeddings } from "./SkillEmbeddings";

export interface VectorDocument {
  id: string;
  embedding?: number[]; // Made optional - not always returned
  metadata: {
    name: string;
    skills: string[];
    experience: number;
    candidateId: string;
  };
  similarity?: number; // For search results
}

// Search result type (without embedding for performance)
export interface SearchResult {
  id: string;
  metadata: {
    name: string;
    skills: string[];
    experience: number;
    candidateId: string;
  };
  similarity: number;
}

export class VectorStore {
  private convex: ConvexHttpClient;
  private embeddings: SkillEmbeddings;

  constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
    this.embeddings = new SkillEmbeddings(convexUrl);
  }

  /**
   * Add or update a document in the vector store
   */
  async upsert(
    id: string,
    text: string,
    metadata: VectorDocument['metadata']
  ): Promise<void> {
    const embedding = await this.embeddings.getEmbedding(text);
    await this.convex.mutation(api.vectors.upsert, {
      id,
      embedding,
      metadata,
    });
  }

  /**
   * Search for similar documents
   * Returns results with similarity scores (embeddings excluded for performance)
   */
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    const embedding = await this.embeddings.getEmbedding(query);
    const results = await this.convex.query(api.vectors.search, {
      embedding,
      limit,
    });
    return results;
  }

  /**
   * Find similar candidates
   * Returns results with similarity scores
   */
  async findSimilar(candidateId: string, limit: number = 5): Promise<SearchResult[]> {
    const results = await this.convex.query(api.vectors.findSimilar, {
      candidateId,
      limit,
    });
    return results;
  }

  /**
   * Get embedding for text (with caching)
   */
  async getEmbedding(text: string): Promise<number[]> {
    return this.embeddings.getEmbedding(text);
  }

  /**
   * Get full document by ID (includes embedding)
   */
  async getDocument(id: string): Promise<VectorDocument | null> {
    // You would need to add a getDocument query in Convex
    // For now, return null or implement a fallback
    return null;
  }
}