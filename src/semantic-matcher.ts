import { EmbeddingModel, FlagEmbedding } from 'fastembed';

export class SemanticMatcher {
  private model: FlagEmbedding | null = null;
  private readonly threshold: number;

  constructor(threshold: number = 0.7) {
    this.threshold = threshold;
  }

  async initialize(): Promise<void> {
    if (!this.model) {
      this.model = await FlagEmbedding.init({
        model: EmbeddingModel.BGESmallENV15,
      });
    }
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
    if (!this.model) {
      throw new Error('SemanticMatcher not initialized. Call initialize() first.');
    }

    const generator = this.model.embed([text]);
    const result = await generator.next();
    if (result.done || !result.value) {
      throw new Error('Failed to generate embedding');
    }
    return Array.from(result.value[0]);
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

  async matchWithThreshold(left: string | string[], right: string, _dim?: string): Promise<boolean> {
    return this.match(left, right);
  }
}
