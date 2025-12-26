// Lexer/Tokenizer for Frisco Programming Language

export enum TokenType {
  // Keywords
  CONCEPT = 'CONCEPT',
  ENTITY = 'ENTITY',
  DESCRIPTION = 'DESCRIPTION',
  ATTRIBUTES = 'ATTRIBUTES',
  ESSENTIALS = 'ESSENTIALS',

  // Operators
  ASSIGN = 'ASSIGN',           // =
  SEMANTIC_MATCH = 'SEMANTIC_MATCH', // ~==
  IMPLIES = 'IMPLIES',         // :-
  QUERY = 'QUERY',            // ?-
  DOT = 'DOT',                // .
  COMMA = 'COMMA',            // ,
  COLON = 'COLON',            // :

  // Brackets
  LPAREN = 'LPAREN',          // (
  RPAREN = 'RPAREN',          // )
  LBRACKET = 'LBRACKET',      // [
  RBRACKET = 'RBRACKET',      // ]

  // Literals
  IDENTIFIER = 'IDENTIFIER',   // variable, predicate names (lowercase_with_underscores)
  CONSTANT = 'CONSTANT',       // constants, entity names (UPPERCASE or PascalCase)
  STRING = 'STRING',           // "quoted text"

  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
}

export type Token = {
  type: TokenType;
  value: string;
  line: number;
  column: number;
};

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  private peek(offset: number = 0): string | null {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : null;
  }

  private advance(): string | null {
    const char = this.peek();
    if (char !== null) {
      this.position++;
      if (char === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    return char;
  }

  private skipWhitespace(): void {
    while (this.peek() !== null && /[ \t\r]/.test(this.peek()!)) {
      this.advance();
    }
  }

  private skipComment(): void {
    if (this.peek() === '#') {
      while (this.peek() !== null && this.peek() !== '\n') {
        this.advance();
      }
    }
  }

  private readString(): string {
    let result = '';
    this.advance(); // skip opening quote

    while (this.peek() !== null && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        if (escaped === 'n') result += '\n';
        else if (escaped === 't') result += '\t';
        else if (escaped === '"') result += '"';
        else if (escaped === '\\') result += '\\';
        else result += escaped;
      } else {
        result += this.advance();
      }
    }

    this.advance(); // skip closing quote
    return result;
  }

  private readIdentifier(): string {
    let result = '';
    while (this.peek() !== null && /[a-zA-Z0-9_]/.test(this.peek()!)) {
      result += this.advance();
    }
    return result;
  }

  private getKeywordOrIdentifier(text: string): TokenType {
    const keywords: { [key: string]: TokenType } = {
      'Concept': TokenType.CONCEPT,
      'Entity': TokenType.ENTITY,
      'description': TokenType.DESCRIPTION,
      'attributes': TokenType.ATTRIBUTES,
      'essentials': TokenType.ESSENTIALS,
    };

    if (keywords[text]) {
      return keywords[text];
    }

    // UPPERCASE or PascalCase -> CONSTANT
    if (/^[A-Z][A-Z0-9_]*$/.test(text) || /^[A-Z][a-z]/.test(text)) {
      return TokenType.CONSTANT;
    }

    // lowercase_with_underscores -> IDENTIFIER
    return TokenType.IDENTIFIER;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) break;

      const char = this.peek();
      const line = this.line;
      const column = this.column;

      // Skip comments
      if (char === '#') {
        this.skipComment();
        continue;
      }

      // Newlines
      if (char === '\n') {
        this.advance();
        continue; // We'll ignore newlines for simplicity
      }

      // String literals
      if (char === '"') {
        const value = this.readString();
        tokens.push({ type: TokenType.STRING, value, line, column });
        continue;
      }

      // Multi-character operators
      if (char === '~' && this.peek(1) === '=' && this.peek(2) === '=') {
        this.advance();
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.SEMANTIC_MATCH, value: '~==', line, column });
        continue;
      }

      if (char === ':' && this.peek(1) === '-') {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.IMPLIES, value: ':-', line, column });
        continue;
      }

      if (char === '?' && this.peek(1) === '-') {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.QUERY, value: '?-', line, column });
        continue;
      }

      // Single character tokens
      const singleChar: { [key: string]: TokenType } = {
        '=': TokenType.ASSIGN,
        '.': TokenType.DOT,
        ',': TokenType.COMMA,
        ':': TokenType.COLON,
        '(': TokenType.LPAREN,
        ')': TokenType.RPAREN,
        '[': TokenType.LBRACKET,
        ']': TokenType.RBRACKET,
      };

      if (singleChar[char!]) {
        tokens.push({ type: singleChar[char!], value: char!, line, column });
        this.advance();
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(char!)) {
        const text = this.readIdentifier();
        const type = this.getKeywordOrIdentifier(text);
        tokens.push({ type, value: text, line, column });
        continue;
      }

      throw new Error(`Unexpected character '${char}' at line ${line}, column ${column}`);
    }

    tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return tokens;
  }
}
