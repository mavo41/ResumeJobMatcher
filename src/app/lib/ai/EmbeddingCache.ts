// lib/ai/EmbeddingCache.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

export class EmbeddingCache {
  private cache: Map<string, number[]> = new Map();
  private model: any;

  constructor() {
    if (GEMINI_KEY) {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      this.model = genAI.getGenerativeModel({ model: "embedding-001" });
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    const key = text.toLowerCase().trim();
    
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    if (!this.model) {
      throw new Error("Embedding model not configured");
    }

    // Generate embedding
    const result = await this.model.embedContent(text);
    const embedding = result.embedding.values;

    // Store in cache
    this.cache.set(key, embedding);
    return embedding;
  }

  // Pre-warm cache with common skills
  async preWarm(skills: string[]) {
    const uniqueSkills = [...new Set(skills)];
    await Promise.all(uniqueSkills.map(skill => this.getEmbedding(skill)));
  }
}