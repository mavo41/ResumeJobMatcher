// lib/ai/SkillEmbeddings.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = "embedding-001";

/**
 * Maximum retry attempts when generating embeddings.
 */
const MAX_RETRIES = 3;
/**
 * Delay between retries (milliseconds).
 */
const BASE_RETRY_DELAY = 500;
/**
 * Maximum concurrent embedding requests.
 */
const MAX_CONCURRENT_REQUESTS = 5;
/**
 * Maximum in-memory cache size.
 */
const MAX_MEMORY_CACHE = 5000;
/**
 * Cache entry interface.
 */
interface CacheEntry {
  embedding: number[];
  createdAt: number;
  hits: number;
}
/**
 * Embedding generation result.
 */
export interface EmbeddingResult {
  text: string;
  embedding: number[];
}
/**
 * Similarity result.
 */
export interface SimilarityResult {
  similarity: number;
  matched: boolean;
}
/**
 * Enterprise embedding service.
 *
 * Responsibilities:
 *
 * • Generate embeddings
 * • Cache embeddings
 * • Batch generation
 * • Similarity calculations
 * • Convex persistence
 * • Retry handling
 * • Performance optimization
 */
export class SkillEmbeddings {
  /**
   * Singleton Gemini model.
   */
  private static model: any = null;
  /**
   * Singleton initialization flag.
   */
  private static initialized = false;
  /**
   * Memory cache.
   */
  private cache = new Map<string, CacheEntry>();
  /**
   * Convex client.
   */
  private convex: ConvexHttpClient | null = null;

  /**
   * Queue used to limit concurrent requests.
   */
  private activeRequests = 0;
  /**
   * Waiting queue.
   */
  private waitingResolvers: Array<() => void> = [];
  constructor(convexUrl?: string) {

    if (!SkillEmbeddings.initialized) {

      if (!GEMINI_API_KEY) {
        console.warn(
          "⚠ GEMINI_API_KEY not found. Semantic matching disabled."
        );
      } else {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        SkillEmbeddings.model =
          genAI.getGenerativeModel({
            model: EMBEDDING_MODEL,
          });
      }
      SkillEmbeddings.initialized = true;
    }

    if (convexUrl) {
      this.convex = new ConvexHttpClient(convexUrl);
    }
  }

  /**
   * Normalize input text.
   */
  private normalize(text: string): string {

    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  }

  /**
   * Wait until concurrency slot becomes available.
   */
  private async acquireSlot(): Promise<void> {

    if (this.activeRequests < MAX_CONCURRENT_REQUESTS) {
      this.activeRequests++;
      return;
    }

    await new Promise<void>((resolve) => {
      this.waitingResolvers.push(resolve);
    });

    this.activeRequests++;
  }

  /**
   * Release concurrency slot.
   */
  private releaseSlot(): void {

    this.activeRequests--;

    const next = this.waitingResolvers.shift();

    if (next) {
      next();
    }
  }
  /**
   * Sleep helper.
   */
  private async sleep(ms: number): Promise<void> {

    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check whether embedding appears valid.
   */
  private isValidEmbedding(vector: number[]): boolean {
    if (!Array.isArray(vector)) return false;
    if (vector.length === 0) return false;
    return vector.every(n => Number.isFinite(n));
  }
  /**
   * Store embedding in memory cache.
   */
  private saveToMemoryCache(
    key: string,
    embedding: number[]
  ): void {
    if (this.cache.size >= MAX_MEMORY_CACHE) {

      // remove oldest entry
      const oldest =
        [...this.cache.entries()]
          .sort((a, b) =>
            a[1].createdAt - b[1].createdAt
          )[0];

      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }
    this.cache.set(key, {
      embedding,
      createdAt: Date.now(),
      hits: 1,
    });
  }
  /**
   * Read from memory cache.
   */
  private getFromMemoryCache(
    key: string
  ): number[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    cached.hits++;
    return cached.embedding;
  }
    /**
   * Read embedding from Convex cache.
   */
  private async getFromDatabaseCache(
    key: string
  ): Promise<number[] | null> {
    if (!this.convex) return null;
    try {
      const api = await import("../../../../convex/_generated/api");
      const cached = await this.convex.query(
        (api as any).embeddingsCache.get,
        {
          text: key,
        }
      );
      if (
        cached &&
        cached.embedding &&
        this.isValidEmbedding(cached.embedding)
      ) {
        this.saveToMemoryCache(key, cached.embedding);
        return cached.embedding;
      }
    } catch (error) {
      console.warn(
        "Failed reading embedding cache:",
        error
      );
    }
    return null;
  }
  /**
   * Save embedding into Convex cache.
   */
  private async saveToDatabaseCache(
    key: string,
    embedding: number[]
  ): Promise<void> {
    if (!this.convex) return;
    try {
      const api = await import("../../../../convex/_generated/api");
      await this.convex.mutation(
        (api as any).embeddingsCache.set,
        {
          text: key,
          embedding,
        }
      );
    } catch (error) {
      console.warn(
        "Unable to cache embedding:",
        error
      );
    }
  }
  /**
   * Generate embedding from Gemini.
   */
  private async generateEmbedding(
    text: string
  ): Promise<number[]> {
    if (!SkillEmbeddings.model) {
      throw new Error(
        "Embedding model is not configured."
      );
    }
    const result =
      await SkillEmbeddings.model.embedContent(text);
    const embedding =
      result?.embedding?.values;
    if (!this.isValidEmbedding(embedding)) {
      throw new Error(
        "Invalid embedding returned by Gemini."
      );
    }
   return embedding;
  }
  /**
   * Main public embedding method.
   *
   * Flow:
   *
   * Memory Cache
   *      ↓
   * Convex Cache
   *      ↓
   * Gemini API
   *      ↓
   * Save everywhere
   */
  async getEmbedding(
    text: string
  ): Promise<number[]> {
    const key = this.normalize(text);
    /**
     * Memory cache
     */
    const memory = this.getFromMemoryCache(key);
    if (memory) {
      return memory;
    }
    /**
     * Database cache
     */
    const database =
      await this.getFromDatabaseCache(key);
    if (database) {
      return database;
    }
    /**
     * Generate embedding
     */
    await this.acquireSlot();
    try {
      let retries = 0;
      while (true) {
        try {
          const embedding =
            await this.generateEmbedding(key);
          this.saveToMemoryCache(
            key,
            embedding
          );
          await this.saveToDatabaseCache(
            key,
            embedding
          );
          return embedding;
        } catch (error) {
          retries++;
          if (retries >= MAX_RETRIES) {
            throw error;
          }

          const delay =
            BASE_RETRY_DELAY *
            Math.pow(2, retries - 1);
          console.warn(
            `Embedding retry ${retries}/${MAX_RETRIES} for "${key}"`
          );

          await this.sleep(delay);
        }
      }

    } finally {
      this.releaseSlot();
    }
  }

  /**
   * Generate embeddings while tolerating failures.
   *
   * Returns only successful embeddings.
   */
  async getEmbeddingSafe(
    text: string
  ): Promise<number[] | null> {

    try {
      return await this.getEmbedding(text);
    } catch (error) {
      console.error(
       "Embedding generation failed:",
        error
      );
      return null;
    }
  }
    /**
   * Generate embeddings for multiple texts.
   *
   * Features:
   * - Removes duplicates
   * - Reuses cache
   * - Processes in parallel
   * - Returns Map<normalizedText, embedding>
   */
  async getEmbeddingsBatch(
    texts: string[]
  ): Promise<Map<string, number[]>> {
    const results = new Map<string, number[]>();
    if (!texts.length) {
      return results;
    }
    // Normalize & deduplicate
    const uniqueTexts = [
      ...new Set(
        texts
          .filter(Boolean)
          .map(text => this.normalize(text))
      ),
    ];

    await Promise.all(
      uniqueTexts.map(async (text) => {
        const embedding =
         await this.getEmbeddingSafe(text);
        if (embedding) {
          results.set(text, embedding);
        }
      })
    );

    return results;
  }

  /**
   * Warm cache before scoring.
   *
   * This dramatically improves performance
   * during candidate scoring.
   */
  async preWarm(
    texts: string[]
  ): Promise<void> {

    if (!texts.length) return;
    try {
      await this.getEmbeddingsBatch(texts);
    } catch (error) {
      console.warn(
        "Prewarm failed:",
        error
      );
    }
  }

  /**
   * Calculate cosine similarity.
   *
   * Returns:
   * 1.0 = identical
   * 0.0 = unrelated
   * -1 = opposite
   */
  cosineSimilarity(
    vectorA: number[],
    vectorB: number[]
  ): number {
    if (
      !this.isValidEmbedding(vectorA) ||
      !this.isValidEmbedding(vectorB)
    ) {
      return 0;
    }

    if (vectorA.length !== vectorB.length) {
      return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dot += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot /
      (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate semantic similarity
   * between two pieces of text.
   */
  async calculateSimilarity(
    textA: string,
    textB: string
  ): Promise<number> {

    const [embeddingA, embeddingB] =
      await Promise.all([
        this.getEmbedding(textA),
        this.getEmbedding(textB),
      ]);

    return this.cosineSimilarity(
      embeddingA,
      embeddingB
    );
  }

  /**
   * Compare one text against
   * multiple candidate texts.
   */
  async compareAgainstMany(
    source: string,
    candidates: string[]
  ): Promise<SimilarityResult[]> {

    const sourceEmbedding =
      await this.getEmbedding(source);

    const candidateEmbeddings =
      await this.getEmbeddingsBatch(candidates);

    const results: SimilarityResult[] = [];
    for (const candidate of candidates) {

      const embedding =
        candidateEmbeddings.get(
          this.normalize(candidate)
        );

      if (!embedding) continue;

      const similarity =
        this.cosineSimilarity(
          sourceEmbedding,
          embedding
        );

      results.push({
        similarity,
        matched: similarity >= 0.60,
      });
    }
    return results;
  }
  /**
   * Find the best semantic match
   * from a collection.
   */
  async findBestMatch(
    source: string,
    candidates: string[]
  ): Promise<{
    text: string | null;
    similarity: number;
  }> {
   if (!candidates.length) {
      return {
        text: null,
        similarity: 0,
      };
    }

    const sourceEmbedding =
      await this.getEmbedding(source);

    const candidateEmbeddings =
      await this.getEmbeddingsBatch(candidates);

    let bestText: string | null = null;

    let bestScore = 0;

    for (const candidate of candidates) {

      const embedding =
        candidateEmbeddings.get(
          this.normalize(candidate)
        );

      if (!embedding) continue;

      const similarity =
        this.cosineSimilarity(
          sourceEmbedding,
          embedding
        );

      if (similarity > bestScore) {
        bestScore = similarity;
        bestText = candidate;
      }
    }

    return {
      text: bestText,
      similarity: bestScore,
    };
  }

    /**
   * Check if an embedding exists in memory cache.
   */
  hasCached(text: string): boolean {
    return this.cache.has(this.normalize(text));
  }

  /**
   * Remove a single cache entry.
   */
  removeFromCache(text: string): boolean {
    return this.cache.delete(this.normalize(text));
  }

  /**
   * Clear the in-memory cache.
   * Does not affect the Convex cache.
   */
  clearMemoryCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStatistics(): {
    entries: number;
    totalHits: number;
    averageHits: number;
  } {
    const entries = this.cache.size;

    const totalHits = [...this.cache.values()].reduce(
      (sum, entry) => sum + entry.hits,
      0
    );

    return {
      entries,
      totalHits,
      averageHits:
        entries === 0
          ? 0
          : Number((totalHits / entries).toFixed(2)),
    };
  }

  /**
   * Returns cache keys.
   * Useful for debugging.
   */
  getCachedTexts(): string[] {
    return [...this.cache.keys()];
  }
  /**
   * Health check for the embedding service.
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    modelLoaded: boolean;
    cacheEntries: number;
    activeRequests: number;
    message: string;
  }> {
    const modelLoaded = SkillEmbeddings.model !== null;

    return {
      healthy: modelLoaded,
      modelLoaded,
      cacheEntries: this.cache.size,
      activeRequests: this.activeRequests,
      message: modelLoaded
        ? "Embedding service operational."
        : "Embedding model unavailable.",
    };
  }

  /**
   * Warm commonly used technical skills.
   * Call once during application startup.
   */
  async warmCommonSkills(): Promise<void> {
    await this.preWarm([
      "javascript",
      "typescript",
      "react",
      "next.js",
      "node.js",
      "express",
      "nestjs",
      "python",
      "django",
      "flask",
      "java",
      "spring boot",
      "c#",
      ".net",
      "php",
      "laravel",
      "mysql",
      "postgresql",
      "mongodb",
      "redis",
      "docker",
      "kubernetes",
      "aws",
      "azure",
      "gcp",
      "graphql",
      "rest api",
      "microservices",
      "machine learning",
      "artificial intelligence",
      "tensorflow",
      "pytorch",
      "computer vision",
      "nlp",
      "git",
      "github",
      "ci/cd",
      "agile",
      "scrum",
    ]);
  }
  /**
   * Destroy the service.
   * Clears runtime resources.
   */
  dispose(): void {
    this.clearMemoryCache();
    this.waitingResolvers.length = 0;
    this.activeRequests = 0;
  }
}