// Browser Semantic Matcher using transformers.js
import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';

// Configure transformers.js to use local models served alongside the app
env.allowLocalModels = true;
env.useBrowserCache = true;
env.localModelPath = '/models/';

export type ProgressCallback = (progress: { status: string; progress?: number }) => void;

export class SemanticMatcherWeb {
  private embedder: FeatureExtractionPipeline | null = null;
  private readonly threshold: number;
  private cache: Map<string, number[]> = new Map();
  private initPromise: Promise<void> | null = null;

  constructor(threshold: number = 0.7) {
    this.threshold = threshold;
  }

  async initialize(onProgress?: ProgressCallback): Promise<void> {
    if (this.embedder) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          progress_callback: onProgress
        }
      );
    })();

    return this.initPromise;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error('SemanticMatcherWeb not initialized. Call initialize() first.');
    }

    // Check cache
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    const result = await this.embedder(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(result.data as Float32Array);

    // Cache the result
    this.cache.set(text, vector);

    return vector;
  }

  async match(left: string | string[], right: string): Promise<boolean> {
    await this.initialize();

    if (typeof left === 'string') {
      const leftEmbed = await this.getEmbedding(left);
      const rightEmbed = await this.getEmbedding(right);
      const similarity = this.cosineSimilarity(leftEmbed, rightEmbed);
      return similarity >= this.threshold;
    } else {
      const rightEmbed = await this.getEmbedding(right);
      for (const item of left) {
        const leftEmbed = await this.getEmbedding(item);
        const similarity = this.cosineSimilarity(leftEmbed, rightEmbed);
        if (similarity >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }

  async getSimilarity(left: string, right: string): Promise<number> {
    await this.initialize();
    const leftEmbed = await this.getEmbedding(left);
    const rightEmbed = await this.getEmbedding(right);
    return this.cosineSimilarity(leftEmbed, rightEmbed);
  }

  async matchWithThreshold(left: string | string[], right: string, dim?: string): Promise<boolean> {
    if (!dim) {
      return this.match(left, right);
    }

    await this.initialize();

    const rightText = `${dim} of ${right}`;
    const rightEmbed = await this.getEmbedding(rightText);

    if (typeof left === 'string') {
      const leftText = `${dim} of ${left}`;
      const leftEmbed = await this.getEmbedding(leftText);
      const similarity = this.cosineSimilarity(leftEmbed, rightEmbed);
      return similarity >= this.threshold;
    } else {
      for (const item of left) {
        const leftText = `${dim} of ${item}`;
        const leftEmbed = await this.getEmbedding(leftText);
        const similarity = this.cosineSimilarity(leftEmbed, rightEmbed);
        if (similarity >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }
}
