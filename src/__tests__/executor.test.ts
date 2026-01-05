import { Lexer } from '../lexer.js';
import { Parser } from '../parser.js';
import { Executor } from '../executor.js';

describe('Executor', () => {
  test('stores concepts in knowledge base', async () => {
    const source = `
      concept Man:
        description = "rational animal",
        attributes = ["finite"]
      .
    `;
    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor();

    await executor.execute(ast);
    const kb = executor.getKnowledgeBase();

    expect(kb.concepts.size).toBe(1);
    expect(kb.concepts.get('Man')?.description).toBe('rational animal');
  });

  test('stores entities in knowledge base', async () => {
    const source = `
      concept Man.
      entity SOCRATES: Man, description = "Socrates".
    `;
    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor();

    await executor.execute(ast);
    const kb = executor.getKnowledgeBase();

    expect(kb.entities.size).toBe(1);
    expect(kb.entities.get('SOCRATES')?.conceptType).toBe('Man');
  });

  test('stores rules in knowledge base', async () => {
    const source = `
      mortal(x) :- Man.attributes =~= "finite".
    `;
    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor();

    await executor.execute(ast);
    const kb = executor.getKnowledgeBase();

    expect(kb.rules).toHaveLength(1);
    expect(kb.rules[0].head.name).toBe('mortal');
  });

  // Skip semantic matching tests in Jest due to ONNX runtime compatibility
  test.skip('evaluates query with semantic matching', async () => {
    const source = `
      concept Man.
        attributes = ["mortal being", "finite existence"]

      entity SOCRATES: Man.
        description = "ancient philosopher"

      mortal(target) :-
        target.description =~= "philosopher",
        Man.attributes =~= "will die eventually".

      ? mortal(SOCRATES).
    `;

    const originalLog = console.log;
    const logs: any[] = [];
    console.log = (...args: any[]) => logs.push(args);

    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor(0.6); // Lower threshold for test

    await executor.execute(ast);

    console.log = originalLog;

    // Should output True
    expect(logs.some(log => log[0] === 'True')).toBe(true);
  }, 30000); // Longer timeout for embedding initialization

  // Skip semantic matching tests in Jest due to ONNX runtime compatibility
  test.skip('handles field access for entities', async () => {
    const source = `
      concept Person.
        essentials = ["consciousness"]

      entity JOHN: Person.
        description = "a person"

      thinking(x) :- x.description =~= "human being".

      ? thinking(JOHN).
    `;

    const originalLog = console.log;
    const logs: any[] = [];
    console.log = (...args: any[]) => logs.push(args);

    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor(0.6);

    await executor.execute(ast);

    console.log = originalLog;

    // Should have logged something
    expect(logs.length).toBeGreaterThan(0);
  }, 30000);

  // Epistemological builtin tests (require LLM at localhost:9090)
  test.skip('has_attr checks if concrete possesses characteristic', async () => {
    const source = `
      test_has_size :- has_attr(size, "elephant").
      test_no_color :- not(has_attr(color, "justice")).
      ? test_has_size.
      ? test_no_color.
    `;

    const originalLog = console.log;
    const logs: unknown[] = [];
    console.log = (...args: unknown[]) => logs.push(args);

    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor();

    await executor.execute(ast);

    console.log = originalLog;
    expect(logs.some(log => Array.isArray(log) && log[0] === 'True')).toBe(true);
  }, 30000);

  test.skip('share_attr checks if both concretes share characteristic', async () => {
    const source = `
      # Both have size - measurement-omission!
      test_share_size :- share_attr(size, "elephant", "mouse").
      # Rock lacks metabolism
      test_no_share :- not(share_attr(metabolism, "dog", "rock")).
      ? test_share_size.
      ? test_no_share.
    `;

    const originalLog = console.log;
    const logs: unknown[] = [];
    console.log = (...args: unknown[]) => logs.push(args);

    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor();

    await executor.execute(ast);

    console.log = originalLog;
    expect(logs.some(log => Array.isArray(log) && log[0] === 'True')).toBe(true);
  }, 30000);

  test.skip('differentia finds distinguishing characteristic', async () => {
    const source = `
      test_diff :- differentia("human", "other animals", X), println("Differentia:", X).
      ? test_diff.
    `;

    const originalLog = console.log;
    const logs: unknown[] = [];
    console.log = (...args: unknown[]) => logs.push(args);

    const lexer = new Lexer(source);
    const parser = new Parser(lexer.tokenize());
    const ast = parser.parse();
    const executor = new Executor();

    await executor.execute(ast);

    console.log = originalLog;
    // Should bind X to something like "rationality"
    expect(logs.some(log => Array.isArray(log) && String(log[0]).includes('Differentia:'))).toBe(true);
  }, 30000);
});
