export enum TokenType {
  CONCEPT = 'CONCEPT',
  ENTITY = 'ENTITY',
  DESCRIPTION = 'DESCRIPTION',
  ATTRIBUTES = 'ATTRIBUTES',
  ESSENTIALS = 'ESSENTIALS',

  ASSIGN = 'ASSIGN',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  SEMANTIC_MATCH = 'SEMANTIC_MATCH',
  IMPLIES = 'IMPLIES',
  BAR = 'BAR',
  SEMICOLON = 'SEMICOLON',
  CUT = 'CUT',
  IF_THEN = 'IF_THEN',
  NEGATION = 'NEGATION',
  QUERY = 'QUERY',
  DOT = 'DOT',
  COMMA = 'COMMA',
  COLON = 'COLON',

  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',

  IDENTIFIER = 'IDENTIFIER',
  CONSTANT = 'CONSTANT',
  STRING = 'STRING',

  EOF = 'EOF',
}




export type Token = {
  type: TokenType;
  value: string;
  line: number;
  column: number;
};

export class Lexer {
  private input: string;
  private position = 0;
  private line = 1;
  private column = 1;

  constructor(input: string) {
    this.input = input;
  }

  private peek(offset = 0): string | null {
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
    while (this.peek() !== null && /[ \t\r\n]/.test(this.peek()!)) {
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
    this.advance();

    while (this.peek() !== null && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        if (escaped === 'n') result += '\n';
        else if (escaped === 't') result += '\t';
        else if (escaped === '"') result += '"';
        else if (escaped === '\\') result += '\\';
        else result += escaped ?? '';
      } else {
        result += this.advance();
      }
    }

    this.advance();
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
      concept: TokenType.CONCEPT,
      entity: TokenType.ENTITY,
      description: TokenType.DESCRIPTION,
      attributes: TokenType.ATTRIBUTES,
      essentials: TokenType.ESSENTIALS,
      not: TokenType.NEGATION,
    };

    if (keywords[text]) {
      return keywords[text];
    }

    if (/^[A-Z][A-Z0-9_]*$/.test(text) || /^[A-Z][a-z]/.test(text)) {
      return TokenType.CONSTANT;
    }

    return TokenType.IDENTIFIER;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.peek() === '#') {
        this.skipComment();
        continue;
      }
      if (this.position >= this.input.length) break;

      const char = this.peek();
      const line = this.line;
      const column = this.column;

      if (char === '"') {
        const value = this.readString();
        tokens.push({ type: TokenType.STRING, value, line, column });
        continue;
      }

      if (char === '=' && this.peek(1) === '~' && this.peek(2) === '=') {
        this.advance();
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.SEMANTIC_MATCH, value: '=~=', line, column });
        continue;
      }

      if (char === ':' && this.peek(1) === '-') {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.IMPLIES, value: ':-', line, column });
        continue;
      }

      if (char === '-' && this.peek(1) === '>') {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.IF_THEN, value: '->', line, column });
        continue;
      }

      if (char === '\\' && this.peek(1) === '+') {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.NEGATION, value: '\\+', line, column });
        continue;
      }

      if (char === '=' && this.peek(1) === '=') {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.EQUAL_EQUAL, value: '==', line, column });
        continue;
      }

      const single: Record<string, TokenType> = {
        '=': TokenType.ASSIGN,
        '?': TokenType.QUERY,
        '.': TokenType.DOT,
        ',': TokenType.COMMA,
        ':': TokenType.COLON,
        '(': TokenType.LPAREN,
        ')': TokenType.RPAREN,
        '[': TokenType.LBRACKET,
        ']': TokenType.RBRACKET,
        '|': TokenType.BAR,
        ';': TokenType.SEMICOLON,
        '!': TokenType.CUT,
      };


      if (char && single[char]) {
        tokens.push({ type: single[char], value: char, line, column });
        this.advance();
        continue;
      }

      if (char !== null && /[a-zA-Z_]/.test(char)) {
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
