// Browser LLM-as-Judge Semantic Matcher
// Uses structured output from localhost:9090 to measure attribute similarity

const SYSTEM_PROMPT = `You are measuring attribute similarity for concept formation.

Given an axis (a measurable attribute) and two concretes, determine how similar they are along ONLY that axis, ignoring all other properties.

This follows measurement-omission: concepts group concretes that share an attribute while differing in its measurement. You are measuring whether two concretes HAVE the attribute and how comparable their measurements are.

Scoring:
- 1.0: Same or nearly identical measurement on this axis
- 0.7-0.9: Clearly comparable, same general range
- 0.4-0.6: Both possess the attribute but measurements differ significantly
- 0.1-0.3: One possesses the attribute weakly or metaphorically
- 0.0: One or both lack this attribute entirely

Respond with ONLY a decimal number between 0 and 1.`;

export type ProgressCallback = (progress: { status: string; progress?: number }) => void;

interface SimilarityResponse {
  similarity: number;
}

export class SemanticMatcherWeb {
  private readonly threshold: number;
  private readonly endpoint: string;

  constructor(threshold: number = 0.7, endpoint: string = 'http://localhost:9090') {
    this.threshold = threshold;
    this.endpoint = endpoint;
  }

  async initialize(onProgress?: ProgressCallback): Promise<void> {
    // No initialization needed for LLM-as-judge approach
    if (onProgress) {
      onProgress({ status: 'ready', progress: 100 });
    }
  }

  private async getSimilarityScore(axis: string, concrete1: string, concrete2: string): Promise<number> {
    const userMessage = `Axis: ${axis}\nConcrete 1: ${concrete1}\nConcrete 2: ${concrete2}`;

    try {
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'similarity_score',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  similarity: { type: 'number' }
                },
                required: ['similarity'],
                additionalProperties: false
              }
            }
          }
        })
      });

      if (!response.ok) {
        console.error(`LLM judge request failed: ${response.status} ${response.statusText}`);
        return 0;
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error('No content in LLM response');
        return 0;
      }

      const parsed: SimilarityResponse = JSON.parse(content);
      const similarity = Math.max(0, Math.min(1, parsed.similarity));
      console.log(`LLM judge similarity for "${axis}" between "${concrete1}" and "${concrete2}": ${similarity.toFixed(4)}`);
      return similarity;
    } catch (error) {
      console.error('Error calling LLM judge:', error);
      return 0;
    }
  }

  async match(left: string | string[], right: string): Promise<boolean> {
    // For general semantic match without specific axis, use "semantic meaning" as axis
    const axis = 'semantic meaning';

    if (typeof left === 'string') {
      const similarity = await this.getSimilarityScore(axis, left, right);
      console.log(`Similarity between "${left}" and "${right}": ${similarity.toFixed(4)}`);
      return similarity >= this.threshold;
    } else {
      for (const item of left) {
        const similarity = await this.getSimilarityScore(axis, item, right);
        console.log(`Similarity between "${item}" and "${right}": ${similarity.toFixed(4)}`);
        if (similarity >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }

  async getSimilarity(left: string, right: string): Promise<number> {
    const similarity = await this.getSimilarityScore('semantic meaning', left, right);
    console.log(`Similarity between "${left}" and "${right}": ${similarity.toFixed(4)}`);
    return similarity;
  }

  async matchWithThreshold(left: string | string[], right: string, dim?: string): Promise<boolean> {
    const axis = dim || 'semantic meaning';

    if (typeof left === 'string') {
      const similarity = await this.getSimilarityScore(axis, left, right);
      console.log(`Similarity for "${axis}" between "${left}" and "${right}": ${similarity.toFixed(4)}`);
      return similarity >= this.threshold;
    } else {
      for (const item of left) {
        const similarity = await this.getSimilarityScore(axis, item, right);
        console.log(`Similarity for "${axis}" between "${item}" and "${right}": ${similarity.toFixed(4)}`);
        if (similarity >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }
}
