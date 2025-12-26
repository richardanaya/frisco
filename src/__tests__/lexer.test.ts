import { Lexer, TokenType } from '../lexer.js';

describe('Lexer', () => {
  test('tokenizes concept declaration', () => {
    const source = 'Concept Man.';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens).toHaveLength(4); // Concept, Man, ., EOF
    expect(tokens[0].type).toBe(TokenType.CONCEPT);
    expect(tokens[1].type).toBe(TokenType.CONSTANT);
    expect(tokens[1].value).toBe('Man');
    expect(tokens[2].type).toBe(TokenType.DOT);
  });

  test('tokenizes string literals', () => {
    const source = 'description = "rational animal"';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.DESCRIPTION);
    expect(tokens[1].type).toBe(TokenType.ASSIGN);
    expect(tokens[2].type).toBe(TokenType.STRING);
    expect(tokens[2].value).toBe('rational animal');
  });

  test('tokenizes semantic match operator', () => {
    const source = 'Man.attributes ~== "some text"';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].value).toBe('Man');
    expect(tokens[1].type).toBe(TokenType.DOT);
    expect(tokens[2].value).toBe('attributes');
    expect(tokens[3].type).toBe(TokenType.SEMANTIC_MATCH);
    expect(tokens[4].type).toBe(TokenType.STRING);
  });

  test('tokenizes rule declaration', () => {
    const source = 'mortal(target) :- target.description ~== "philosopher".';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].value).toBe('mortal');
    expect(tokens[1].type).toBe(TokenType.LPAREN);
    expect(tokens[2].value).toBe('target');
    expect(tokens[3].type).toBe(TokenType.RPAREN);
    expect(tokens[4].type).toBe(TokenType.IMPLIES);
  });

  test('tokenizes query', () => {
    const source = '?- mortal(SOCRATES).';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.QUERY);
    expect(tokens[1].value).toBe('mortal');
    expect(tokens[2].type).toBe(TokenType.LPAREN);
    expect(tokens[3].value).toBe('SOCRATES');
    expect(tokens[4].type).toBe(TokenType.RPAREN);
    expect(tokens[5].type).toBe(TokenType.DOT);
  });

  test('skips comments', () => {
    const source = '# This is a comment\nConcept Man.';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.CONCEPT);
    expect(tokens[1].value).toBe('Man');
  });

  test('tokenizes array of strings', () => {
    const source = '["first", "second", "third"]';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.LBRACKET);
    expect(tokens[1].type).toBe(TokenType.STRING);
    expect(tokens[1].value).toBe('first');
    expect(tokens[2].type).toBe(TokenType.COMMA);
    expect(tokens[3].type).toBe(TokenType.STRING);
    expect(tokens[3].value).toBe('second');
  });
});
