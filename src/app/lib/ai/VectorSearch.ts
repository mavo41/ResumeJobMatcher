// lib/ai/VectorSearch.ts
import { EmbeddingCache } from './EmbeddingCache';

export interface VectorDocument {
  id: string;
  embedding: number[];
  metadata: {
    name: string;
    skills: string[];
    experience: number;
  };
}

export class VectorSearch {
  private documents: VectorDocument[] = [];
  private embeddingCache = new EmbeddingCache();

  async addDocument(id: string, text: string, metadata: VectorDocument['metadata']) {
    const embedding = await this.embeddingCache.getEmbedding(text);
    this.documents.push({ id, embedding, metadata });
  }

  async search(query: string, limit: number = 10): Promise<VectorDocument[]> {
    const queryEmbedding = await this.embeddingCache.getEmbedding(query);
    
    // Calculate cosine similarity for all documents
    const scored = this.documents.map(doc => ({
      doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by score descending and return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.doc);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}