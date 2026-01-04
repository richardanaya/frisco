import { Token, TokenType } from './lexer.js';
import * as AST from './ast.js';

export class Parser {
  private tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    const pos = this.position + offset;
    return pos < this.tokens.length ? this.tokens[pos] : this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    return this.tokens[this.position++];
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): Token | null {
    if (types.includes(this.peek().type)) {
      return this.advance();
    }
    return null;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} at line ${token.line}, column ${token.column}`);
    }
    return this.advance();
  }

  public parse(): AST.Program {
    const statements: AST.Statement[] = [];
    while (!this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
    }
    return { type: 'Program', statements };
  }

  private parseStatement(): AST.Statement {
    if (this.check(TokenType.CONCEPT)) return this.parseConceptDeclaration();
    if (this.check(TokenType.ENTITY)) return this.parseEntityDeclaration();
    if (this.check(TokenType.QUERY)) return this.parseQuery();
    if (this.check(TokenType.IDENTIFIER) && this.peek(1).type === TokenType.LPAREN) {
      // Check if it's a fact (ends with DOT) or rule (has IMPLIES)
      const startPos = this.position;
      try {
        this.parsePredicateHead();
        if (this.check(TokenType.DOT)) {
          this.position = startPos;
          const head = this.parsePredicateHead();
          this.expect(TokenType.DOT);
          return { type: 'RuleDeclaration', head, body: [] };
        } else {
          this.position = startPos;
        }
      } catch {
        this.position = startPos;
      }
    }
    return this.parseRuleOrAssignment();
  }

  private parseConceptDeclaration(): AST.ConceptDeclaration {
    this.expect(TokenType.CONCEPT);
    const name = this.expect(TokenType.IDENTIFIER).value;

    let genus: string | null = null;
    if (this.match(TokenType.COLON)) {
      if (this.check(TokenType.IDENTIFIER) && this.peek(1).type === TokenType.COMMA) {
        genus = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.COMMA);
      } else {
        genus = null;
      }

      // parse comma-separated properties
      let description: string | null = null;
      let attributes: string[] = [];
      let essentials: string[] = [];

      // parse first property
      if (this.match(TokenType.DESCRIPTION)) {
        this.expect(TokenType.ASSIGN);
        description = this.expect(TokenType.STRING).value;
      } else if (this.match(TokenType.ATTRIBUTES)) {
        this.expect(TokenType.ASSIGN);
        attributes = this.parseStringArray();
      } else if (this.match(TokenType.ESSENTIALS)) {
        this.expect(TokenType.ASSIGN);
        essentials = this.parseIdentifierOrStringArray();
      }

      // then comma-separated
      while (this.match(TokenType.COMMA)) {
        if (this.match(TokenType.DESCRIPTION)) {
          this.expect(TokenType.ASSIGN);
          description = this.expect(TokenType.STRING).value;
        } else if (this.match(TokenType.ATTRIBUTES)) {
          this.expect(TokenType.ASSIGN);
          attributes = this.parseStringArray();
        } else if (this.match(TokenType.ESSENTIALS)) {
          this.expect(TokenType.ASSIGN);
          essentials = this.parseIdentifierOrStringArray();
        }
      }

      this.expect(TokenType.DOT);
      return { type: 'ConceptDeclaration', name, genus, description, attributes, essentials };
    }

    // old style fallback, but we can remove it since we're updating
    this.match(TokenType.DOT);
    return { type: 'ConceptDeclaration', name, genus: null, description: null, attributes: [], essentials: [] };
  }

  private parseEntityDeclaration(): AST.EntityDeclaration {
    this.expect(TokenType.ENTITY);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.COLON);
    const conceptType = this.expect(TokenType.IDENTIFIER).value;

    let description: string | null = null;
    const properties = new Map<string, string>();

    // Support comma-separated properties: entity NAME: CONCEPT, prop = "value", ...
    if (this.match(TokenType.COMMA)) {
      // Parse first property
      if (this.match(TokenType.DESCRIPTION)) {
        this.expect(TokenType.ASSIGN);
        description = this.expect(TokenType.STRING).value;
      } else if (this.check(TokenType.IDENTIFIER)) {
        const propName = this.advance().value;
        this.expect(TokenType.ASSIGN);
        const propValue = this.expect(TokenType.STRING).value;
        properties.set(propName, propValue);
      }

      // Parse remaining properties
      while (this.match(TokenType.COMMA)) {
        if (this.match(TokenType.DESCRIPTION)) {
          this.expect(TokenType.ASSIGN);
          description = this.expect(TokenType.STRING).value;
        } else if (this.check(TokenType.IDENTIFIER)) {
          const propName = this.advance().value;
          this.expect(TokenType.ASSIGN);
          const propValue = this.expect(TokenType.STRING).value;
          properties.set(propName, propValue);
        }
      }
    }

    this.match(TokenType.DOT);

    return { type: 'EntityDeclaration', name, conceptType, description, properties };
  }

  private parseRuleOrAssignment(): AST.RuleDeclaration | AST.Assignment {
    const first = this.peek();
    const second = this.peek(1);
    if (first.type === TokenType.IDENTIFIER && second.type === TokenType.ASSIGN) {
      return this.parseAssignment();
    }
    return this.parseRuleDeclaration();
  }

  private parseRuleDeclaration(): AST.RuleDeclaration {
    const head = this.parsePredicateHead();
    this.expect(TokenType.IMPLIES);
    const body = this.parseGoalBody();
    this.match(TokenType.DOT);
    return { type: 'RuleDeclaration', head, body };
  }

  private parsePredicateHead(): AST.PredicateHead {
    const name = this.expect(TokenType.IDENTIFIER).value;
    const parameters: AST.Term[] = [];
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        parameters.push(this.parseTerm());
        while (this.match(TokenType.COMMA)) {
          parameters.push(this.parseTerm());
        }
      }
      this.expect(TokenType.RPAREN);
    }
    return { name, parameters };
  }

  private parseQuery(): AST.Query {
    this.expect(TokenType.QUERY);
    const body = this.parseGoalBody();
    this.match(TokenType.DOT);
    return { type: 'Query', body };
  }

  private parseGoalBody(): AST.Condition[] {
    return this.parseDisjunction();
  }

  private parseDisjunction(): AST.Condition[] {
    let branches: AST.Condition[][] = [this.parseIfThenElse()];
    while (this.match(TokenType.SEMICOLON)) {
      branches.push(this.parseIfThenElse());
    }
    if (branches.length === 1) return branches[0];
    let acc: AST.Condition[] = branches[0];
    for (let i = 1; i < branches.length; i++) {
      acc = [{ type: 'Disjunction', left: acc, right: branches[i] } as AST.Condition];
    }
    return acc;
  }

  private parseIfThenElse(): AST.Condition[] {
    const condSeq = this.parseConjunction();
    if (this.match(TokenType.IF_THEN)) {
      const thenSeq = this.parseConjunction();
      let elseSeq: AST.Condition[] = [];
      if (this.match(TokenType.SEMICOLON)) {
        elseSeq = this.parseConjunction();
      }
      return [{ type: 'IfThenElse', condition: condSeq, thenBranch: thenSeq, elseBranch: elseSeq } as AST.Condition];
    }
    return condSeq;
  }

  private parseConjunction(): AST.Condition[] {
    const seq: AST.Condition[] = [];
    seq.push(this.parseAtomicCondition());
    while (this.match(TokenType.COMMA)) {
      seq.push(this.parseAtomicCondition());
    }
    return seq;
  }

  private parseAtomicCondition(): AST.Condition {
    if (this.match(TokenType.CUT)) return { type: 'Cut' };

    if (this.match(TokenType.NEGATION)) {
      const goals = this.parseAtomicCondition();
      return { type: 'Negation', goals: [goals] };
    }

    if (this.check(TokenType.IDENTIFIER) && this.peek(1).type === TokenType.LPAREN) {
      return this.parsePredicateCall();
    }

    const leftTerm = this.parseTerm();

    if (this.match(TokenType.SEMANTIC_MATCH)) {
      const right = this.parseTerm();
      return { type: 'SemanticMatch', left: leftTerm, right };
    }

    const equalityToken = this.match(TokenType.EQUAL_EQUAL) || this.match(TokenType.ASSIGN);
    if (equalityToken) {
      const right = this.parseTerm();
      return {
        type: 'Equality',
        operator: equalityToken.type === TokenType.EQUAL_EQUAL ? '==' : '=',
        left: leftTerm,
        right,
      };
    }

    if (leftTerm.type === 'CompoundTerm') {
      return { type: 'PredicateCall', name: leftTerm.functor, arguments: leftTerm.args };
    }

    throw new Error(`Unexpected condition at line ${this.peek().line}, column ${this.peek().column}: unexpected token ${this.peek().type} '${this.peek().value}'`);
  }

  private parsePredicateCall(): AST.PredicateCall {
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LPAREN);
    const args: AST.Term[] = [];
    if (!this.check(TokenType.RPAREN)) {
      args.push(this.parseTerm());
      while (this.match(TokenType.COMMA)) {
        args.push(this.parseTerm());
      }
    }
    this.expect(TokenType.RPAREN);
    return { type: 'PredicateCall', name, arguments: args };
  }

  private parseExpression(): AST.Term {
    return this.parsePrimary();
  }

  private parsePrimary(): AST.Term {
    if (this.check(TokenType.STRING)) {
      const value = this.advance().value;
      return { type: 'StringLiteral', value };
    }

    if (this.check(TokenType.LBRACKET)) {
      return this.parseList();
    }

    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args: AST.Term[] = [];
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseTerm());
          while (this.match(TokenType.COMMA)) {
            args.push(this.parseTerm());
          }
        }
        this.expect(TokenType.RPAREN);
        return { type: 'CompoundTerm', functor: name, args };
      }
      if (this.check(TokenType.DOT)) {
        this.advance();
        const field = this.advance().value;
        return { type: 'FieldAccess', object: name, field };
      }
      if (name === '_') {
        return { type: 'Variable', name, anonymous: true };
      }
      if (/^[a-z]/.test(name)) {
        return { type: 'Variable', name };
      }
      return { type: 'Atom', value: name };
    }

    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    throw new Error(`Unexpected token ${this.peek().type} at line ${this.peek().line}, column ${this.peek().column}`);
  }

  private parseTerm(): AST.Term {
    return this.parseExpression();
  }

  private parseList(): AST.List {
    this.expect(TokenType.LBRACKET);
    const elements: AST.Term[] = [];
    let tail: AST.Term | null | undefined = null;

    if (!this.check(TokenType.RBRACKET)) {
      elements.push(this.parseTerm());
      while (this.match(TokenType.COMMA)) {
        elements.push(this.parseTerm());
      }
      if (this.match(TokenType.BAR)) {
        tail = this.parseTerm();
      }
    }

    this.expect(TokenType.RBRACKET);
    return { type: 'List', elements, tail };
  }

  private parseAssignment(): AST.Assignment {
    const variable = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.ASSIGN);
    const valueToken = this.advance();
    const value = valueToken.value;
    return { type: 'Assignment', variable, value };
  }

  private parseStringArray(): string[] {
    this.expect(TokenType.LBRACKET);
    const items: string[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      items.push(this.expect(TokenType.STRING).value);
      while (this.match(TokenType.COMMA)) {
        if (this.check(TokenType.RBRACKET)) break;
        items.push(this.expect(TokenType.STRING).value);
      }
    }
    this.expect(TokenType.RBRACKET);
    return items;
  }

  private parseIdentifierOrStringArray(): string[] {
    this.expect(TokenType.LBRACKET);
    const items: string[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      const first = this.advance();
      items.push(first.value);
      while (this.match(TokenType.COMMA)) {
        if (this.check(TokenType.RBRACKET)) break;
        items.push(this.advance().value);
      }
    }
    this.expect(TokenType.RBRACKET);
    return items;
  }
}
