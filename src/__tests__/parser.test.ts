import { Lexer } from '../lexer.js';
import { Parser } from '../parser.js';

describe('Parser', () => {
  test('parses concept declaration', () => {
    const source = `
      Concept Man.
        description = "rational animal"
        attributes = ["finite lifespan"]
        essentials = ["rational_faculty"]
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.statements).toHaveLength(1);
    expect(ast.statements[0].type).toBe('ConceptDeclaration');
    const concept = ast.statements[0] as any;
    expect(concept.name).toBe('Man');
    expect(concept.description).toBe('rational animal');
    expect(concept.attributes).toEqual(['finite lifespan']);
    expect(concept.essentials).toEqual(['rational_faculty']);
  });

  test('parses entity declaration', () => {
    const source = `
      Entity SOCRATES: Man.
        description = "Socrates"
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.statements).toHaveLength(1);
    expect(ast.statements[0].type).toBe('EntityDeclaration');
    const entity = ast.statements[0] as any;
    expect(entity.name).toBe('SOCRATES');
    expect(entity.conceptType).toBe('Man');
    expect(entity.description).toBe('Socrates');
  });

  test('parses rule with semantic match', () => {
    const source = `
      mortal(target) :-
        target.description ~== "philosopher".
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.statements).toHaveLength(1);
    expect(ast.statements[0].type).toBe('RuleDeclaration');
    const rule = ast.statements[0] as any;
    expect(rule.head.name).toBe('mortal');
    expect(rule.head.parameters).toEqual(['target']);
    expect(rule.body).toHaveLength(1);
    expect(rule.body[0].type).toBe('SemanticMatch');
    expect(rule.body[0].left.object).toBe('target');
    expect(rule.body[0].left.field).toBe('description');
    expect(rule.body[0].right).toBe('philosopher');
  });

  test('parses rule with multiple conditions', () => {
    const source = `
      mortal(target) :-
        target.description ~== "philosopher",
        Man.attributes ~== "finite".
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const rule = ast.statements[0] as any;
    expect(rule.body).toHaveLength(2);
  });

  test('parses query', () => {
    const source = '?- mortal(SOCRATES).';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.statements).toHaveLength(1);
    expect(ast.statements[0].type).toBe('Query');
    const query = ast.statements[0] as any;
    expect(query.predicate.name).toBe('mortal');
    expect(query.predicate.arguments).toEqual(['SOCRATES']);
  });

  test('parses complete program', () => {
    const source = `
      Concept Man.
        description = "rational animal"

      Entity SOCRATES: Man.
        description = "Socrates"

      mortal(x) :- Man.attributes ~== "finite".

      ?- mortal(SOCRATES).
    `;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.statements).toHaveLength(4);
    expect(ast.statements[0].type).toBe('ConceptDeclaration');
    expect(ast.statements[1].type).toBe('EntityDeclaration');
    expect(ast.statements[2].type).toBe('RuleDeclaration');
    expect(ast.statements[3].type).toBe('Query');
  });
});
