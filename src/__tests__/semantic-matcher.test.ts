import { SemanticMatcher } from '../semantic-matcher.js';

// Skip semantic matcher tests in Jest due to ONNX runtime compatibility issues
// These tests work fine when run outside of Jest environment
describe.skip('SemanticMatcher', () => {
  let matcher: SemanticMatcher;

  beforeAll(async () => {
    matcher = new SemanticMatcher(0.7);
    await matcher.initialize();
  }, 30000);

  test('matches semantically similar strings', async () => {
    const result = await matcher.match('dog', 'canine');
    expect(result).toBe(true);
  }, 10000);

  test('does not match semantically dissimilar strings', async () => {
    const result = await matcher.match('dog', 'mathematics');
    expect(result).toBe(false);
  }, 10000);

  test('matches array when at least one element is similar', async () => {
    const result = await matcher.match(
      ['apple', 'banana', 'dog'],
      'puppy'
    );
    expect(result).toBe(true);
  }, 10000);

  test('does not match array when no elements are similar', async () => {
    const result = await matcher.match(
      ['apple', 'banana', 'orange'],
      'vehicle'
    );
    expect(result).toBe(false);
  }, 10000);

  test('gets similarity score', async () => {
    const similarity = await matcher.getSimilarity('king', 'monarch');
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThanOrEqual(1.0);
  }, 10000);

  test('handles identical strings', async () => {
    const similarity = await matcher.getSimilarity('hello', 'hello');
    expect(similarity).toBeGreaterThan(0.99);
  }, 10000);
});
