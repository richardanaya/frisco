// LLM-as-Judge Semantic Matcher
// Implements epistemologically-grounded operations for concept formation

// System prompt for conceptual identity (=~= operator)
const CONCEPTUAL_IDENTITY_PROMPT = `You are judging conceptual identity.

Given two descriptions, determine whether they refer to the same concept or entity.
This is about linguistic co-reference: do these expressions pick out the same abstract concept or concrete referent?

Examples:
- "dog" and "canine" -> same concept (1.0)
- "happy" and "joyful" -> same concept (1.0)
- "philosopher" and "lover of wisdom" -> same concept (0.9)
- "dog" and "animal" -> related but not identical (0.5)
- "dog" and "mathematics" -> different concepts (0.0)

Return a score from 0.0 to 1.0 indicating conceptual identity.`;

// System prompt for has_attr (checking if concrete possesses characteristic)
const HAS_ATTRIBUTE_PROMPT = `You are judging whether a concrete possesses a characteristic.

Given a characteristic (an attribute type) and a concrete (an entity or thing), determine whether the concrete possesses this characteristic AT ALL, regardless of its specific measurement.

This implements measurement-omission from Objectivist epistemology: we care whether the attribute EXISTS, not its specific value.

Examples:
- Characteristic: "size", Concrete: "elephant" -> true (elephants have size)
- Characteristic: "size", Concrete: "mouse" -> true (mice have size too!)
- Characteristic: "color", Concrete: "justice" -> false (abstractions lack color)
- Characteristic: "lifespan", Concrete: "rock" -> false (rocks don't have lifespans)
- Characteristic: "temperature", Concrete: "water" -> true (water has temperature)

Return true if the concrete possesses this characteristic, false if it lacks it entirely.`;

// System prompt for share_attr (checking if both concretes possess characteristic)
const SHARE_ATTRIBUTE_PROMPT = `You are judging whether two concretes both possess a characteristic.

Given a characteristic and two concretes, determine whether BOTH possess this characteristic, regardless of their specific measurements.

This implements measurement-omission: the key question is whether they SHARE the attribute type, not whether their measurements are similar.

Examples:
- Characteristic: "size", Concrete1: "elephant", Concrete2: "mouse" -> true (both have size!)
- Characteristic: "color", Concrete1: "apple", Concrete2: "fire truck" -> true (both have color)
- Characteristic: "metabolism", Concrete1: "dog", Concrete2: "rock" -> false (rock lacks metabolism)
- Characteristic: "lifespan", Concrete1: "human", Concrete2: "corporation" -> debatable/metaphorical

Return true if BOTH possess the characteristic, false if either lacks it.`;

// System prompt for differentia (what distinguishes one from another)
const DIFFERENTIA_PROMPT = `You are identifying the differentia - what distinguishes one thing from another.

In Objectivist epistemology, a definition has the form "genus + differentia" - the category something belongs to, plus what distinguishes it from other members of that category.

Given two things (where the second is typically the genus or comparison class), identify the key characteristic that distinguishes the first from the second.

Examples:
- A: "human", B: "other animals" -> differentia: "rationality" or "rational faculty"
- A: "square", B: "rectangles" -> differentia: "equal sides"
- A: "triangle", B: "polygons" -> differentia: "three sides"

Return the distinguishing characteristic as a concise phrase.`;

// System prompt for similar_attr (gradient similarity - less epistemologically pure but still useful)
const SIMILAR_ATTR_PROMPT = `You are measuring attribute similarity for concept formation.

Given an axis (a measurable attribute) and two concretes, determine how similar they are along ONLY that axis, ignoring all other properties.

Scoring:
- 1.0: Same or nearly identical measurement on this axis
- 0.7-0.9: Clearly comparable, same general range
- 0.4-0.6: Both possess the attribute but measurements differ significantly
- 0.1-0.3: One possesses the attribute weakly or metaphorically
- 0.0: One or both lack this attribute entirely

Respond with a similarity score.`;

interface SimilarityResponse {
  similarity: number;
}

interface BooleanResponse {
  result: boolean;
}

interface StringResponse {
  result: string;
}

export class SemanticMatcher {
  private readonly threshold: number;
  private readonly endpoint: string;

  constructor(threshold: number = 0.7, endpoint: string = 'http://localhost:9090') {
    this.threshold = threshold;
    this.endpoint = endpoint;
  }

  async initialize(): Promise<void> {
    // No initialization needed for LLM-as-judge approach
  }

  private async callLLM<T>(systemPrompt: string, userMessage: string, schema: object): Promise<T | null> {
    try {
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'response',
              strict: true,
              schema
            }
          }
        })
      });

      if (!response.ok) {
        console.error(`LLM judge request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error('No content in LLM response');
        return null;
      }

      return JSON.parse(content) as T;
    } catch (error) {
      console.error('Error calling LLM judge:', error);
      return null;
    }
  }

  // =~= operator: conceptual identity (linguistic co-reference)
  async match(left: string | string[], right: string): Promise<boolean> {
    if (typeof left === 'string') {
      const score = await this.getConceptualIdentity(left, right);
      return score >= this.threshold;
    } else {
      for (const item of left) {
        const score = await this.getConceptualIdentity(item, right);
        if (score >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }

  async getConceptualIdentity(a: string, b: string): Promise<number> {
    const userMessage = `Description 1: ${a}\nDescription 2: ${b}`;
    const schema = {
      type: 'object',
      properties: { similarity: { type: 'number' } },
      required: ['similarity'],
      additionalProperties: false
    };
    const result = await this.callLLM<SimilarityResponse>(CONCEPTUAL_IDENTITY_PROMPT, userMessage, schema);
    return result ? Math.max(0, Math.min(1, result.similarity)) : 0;
  }

  // Alias for backwards compatibility
  async getSimilarity(left: string, right: string): Promise<number> {
    return this.getConceptualIdentity(left, right);
  }

  // has_attr/2: Does this concrete possess this characteristic?
  async hasAttribute(characteristic: string, concrete: string): Promise<boolean> {
    const userMessage = `Characteristic: ${characteristic}\nConcrete: ${concrete}`;
    const schema = {
      type: 'object',
      properties: { result: { type: 'boolean' } },
      required: ['result'],
      additionalProperties: false
    };
    const result = await this.callLLM<BooleanResponse>(HAS_ATTRIBUTE_PROMPT, userMessage, schema);
    return result?.result ?? false;
  }

  // share_attr/3: Do both concretes possess this characteristic?
  async shareAttribute(characteristic: string, a: string, b: string): Promise<boolean> {
    const userMessage = `Characteristic: ${characteristic}\nConcrete 1: ${a}\nConcrete 2: ${b}`;
    const schema = {
      type: 'object',
      properties: { result: { type: 'boolean' } },
      required: ['result'],
      additionalProperties: false
    };
    const result = await this.callLLM<BooleanResponse>(SHARE_ATTRIBUTE_PROMPT, userMessage, schema);
    return result?.result ?? false;
  }

  // differentia/3: What distinguishes A from B?
  async getDifferentia(a: string, b: string): Promise<string> {
    const userMessage = `A (the thing to define): ${a}\nB (the genus/comparison class): ${b}`;
    const schema = {
      type: 'object',
      properties: { result: { type: 'string' } },
      required: ['result'],
      additionalProperties: false
    };
    const result = await this.callLLM<StringResponse>(DIFFERENTIA_PROMPT, userMessage, schema);
    return result?.result ?? '';
  }

  // similar_attr/3: Gradient similarity along an axis (less pure but still useful)
  async getSimilarityAlongAxis(axis: string, a: string, b: string): Promise<number> {
    const userMessage = `Axis: ${axis}\nConcrete 1: ${a}\nConcrete 2: ${b}`;
    const schema = {
      type: 'object',
      properties: { similarity: { type: 'number' } },
      required: ['similarity'],
      additionalProperties: false
    };
    const result = await this.callLLM<SimilarityResponse>(SIMILAR_ATTR_PROMPT, userMessage, schema);
    return result ? Math.max(0, Math.min(1, result.similarity)) : 0;
  }

  // Backwards compatibility: matchWithThreshold uses similar_attr logic
  async matchWithThreshold(left: string | string[], right: string, dim?: string): Promise<boolean> {
    const axis = dim || 'conceptual identity';

    if (typeof left === 'string') {
      const similarity = axis === 'conceptual identity'
        ? await this.getConceptualIdentity(left, right)
        : await this.getSimilarityAlongAxis(axis, left, right);
      return similarity >= this.threshold;
    } else {
      for (const item of left) {
        const similarity = axis === 'conceptual identity'
          ? await this.getConceptualIdentity(item, right)
          : await this.getSimilarityAlongAxis(axis, item, right);
        if (similarity >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }
}
