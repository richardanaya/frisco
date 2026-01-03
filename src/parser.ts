// Parser for Frisco Programming Language

import { Token, TokenType } from './lexer.js';
import * as AST from './ast.js';

export class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset: number = 0): Token {
    const pos = this.position + offset;
    return pos < this.tokens.length ? this.tokens[pos] : this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    return this.tokens[this.position++];
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(
        `Expected ${type} but got ${token.type} at line ${token.line}, column ${token.column}`
      );
    }
    return this.advance();
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  public parse(): AST.Program {
    const statements: AST.Statement[] = [];

    while (!this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
    }

    return { type: 'Program', statements };
  }

  private parseStatement(): AST.Statement {
    if (this.check(TokenType.CONCEPT)) {
      return this.parseConceptDeclaration();
    } else if (this.check(TokenType.ENTITY)) {
      return this.parseEntityDeclaration();
    } else if (this.check(TokenType.QUERY)) {
      return this.parseQuery();
    } else if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.CONSTANT)) {
      // Look ahead to distinguish between assignment and rule
      const ahead = this.peek(1);
      if (ahead.type === TokenType.ASSIGN) {
        return this.parseAssignment();
      } else {
        return this.parseRuleDeclaration();
      }
    } else {
      const token = this.peek();
      throw new Error(`Unexpected token ${token.type} at line ${token.line}, column ${token.column}`);
    }
  }

  // Concept Man
  //   description = "rational animal"
  //   attributes = [...]
  //   essentials = [...]
  // Or: Concept Man: Animal (with parent concept)
  private parseConceptDeclaration(): AST.ConceptDeclaration {
    this.expect(TokenType.CONCEPT);
    const name = this.expect(TokenType.CONSTANT).value;

    // Check for parent concept (genus)
    let genus: string | null = null;
    if (this.check(TokenType.COLON)) {
      this.advance();
      genus = this.expect(TokenType.CONSTANT).value;
    }

    // Period is optional - skip if present
    if (this.check(TokenType.DOT)) {
      this.advance();
    }
    // Skip optional newlines
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    let description: string | null = null;
    let attributes: string[] = [];
    let essentials: string[] = [];

    while (!this.check(TokenType.CONCEPT) && !this.check(TokenType.ENTITY) &&
           !this.check(TokenType.IDENTIFIER) && !this.check(TokenType.QUERY) &&
           !this.check(TokenType.EOF)) {

      if (this.check(TokenType.DESCRIPTION)) {
        this.advance();
        this.expect(TokenType.ASSIGN);
        description = this.expect(TokenType.STRING).value;
      } else if (this.check(TokenType.ATTRIBUTES)) {
        this.advance();
        this.expect(TokenType.ASSIGN);
        attributes = this.parseStringArray();
      } else if (this.check(TokenType.ESSENTIALS)) {
        this.advance();
        this.expect(TokenType.ASSIGN);
        essentials = this.parseIdentifierOrStringArray();
      } else {
        break;
      }
    }

    return {
      type: 'ConceptDeclaration',
      name,
      genus,
      description,
      attributes,
      essentials,
    };
  }

  // Entity SOCRATES: Man.
  //   description = "Socrates"
  private parseEntityDeclaration(): AST.EntityDeclaration {
    this.expect(TokenType.ENTITY);
    const name = this.expect(TokenType.CONSTANT).value;
    this.expect(TokenType.COLON);
    const conceptType = this.expect(TokenType.CONSTANT).value;
    // Period is optional - skip if present
    if (this.check(TokenType.DOT)) {
      this.advance();
    }
    // Skip optional newlines
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    let description: string | null = null;

    if (this.check(TokenType.DESCRIPTION)) {
      this.advance();
      this.expect(TokenType.ASSIGN);
      description = this.expect(TokenType.STRING).value;
    }

    return {
      type: 'EntityDeclaration',
      name,
      conceptType,
      description,
    };
  }

  // all_men_mortal :-
  //   Man.attributes ~== "limited existence".
  private parseRuleDeclaration(): AST.RuleDeclaration {
    const head = this.parsePredicateHead();
    this.expect(TokenType.IMPLIES);

    const body: AST.Condition[] = [];
    body.push(this.parseCondition());

    while (this.check(TokenType.COMMA)) {
      this.advance();
      body.push(this.parseCondition());
    }

    this.expect(TokenType.DOT);

    return {
      type: 'RuleDeclaration',
      head,
      body,
    };
  }

  private parsePredicateHead(): AST.PredicateHead {
    const name = this.expect(TokenType.IDENTIFIER).value;
    const parameters: string[] = [];

    if (this.check(TokenType.LPAREN)) {
      this.advance();

      if (!this.check(TokenType.RPAREN)) {
        // Parameters can be either IDENTIFIER or CONSTANT (for variables like X)
        const first = this.advance();
        parameters.push(first.value);

        while (this.check(TokenType.COMMA)) {
          this.advance();
          const param = this.advance();
          parameters.push(param.value);
        }
      }

      this.expect(TokenType.RPAREN);
    }

    return { name, parameters };
  }

  private parseCondition(): AST.Condition {
    // Check if it's a semantic match: target.field ~== "string"
    if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.CONSTANT)) {
      const ahead1 = this.peek(1);
      if (ahead1.type === TokenType.DOT) {
        return this.parseSemanticMatch();
      } else if (ahead1.type === TokenType.LPAREN) {
        return this.parsePredicateCall();
      }
    }

    throw new Error(`Unexpected condition at line ${this.peek().line}`);
  }

  // Man.attributes ~== "some text"
  private parseSemanticMatch(): AST.SemanticMatchCondition {
    const object = this.advance().value;
    this.expect(TokenType.DOT);
    const field = this.advance().value;
    this.expect(TokenType.SEMANTIC_MATCH);
    const right = this.expect(TokenType.STRING).value;

    return {
      type: 'SemanticMatch',
      left: { type: 'FieldAccess', object, field },
      right,
    };
  }

  // mortal(SOCRATES)
  private parsePredicateCall(): AST.PredicateCall {
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LPAREN);

    const args: AST.Argument[] = [];
    if (!this.check(TokenType.RPAREN)) {
      args.push(this.parseArgument());

      while (this.check(TokenType.COMMA)) {
        this.advance();
        args.push(this.parseArgument());
      }
    }

    this.expect(TokenType.RPAREN);

    return {
      type: 'PredicateCall',
      name,
      arguments: args,
    };
  }

  // Parse an argument (can be a simple value or field access)
  private parseArgument(): AST.Argument {
    const token = this.advance();
    const value = token.value;

    // Check if this is field access (e.g., Man.genus)
    if (this.check(TokenType.DOT)) {
      this.advance(); // consume the dot
      const field = this.advance().value;
      return {
        type: 'FieldAccess',
        object: value,
        field: field,
      };
    }

    // Otherwise, it's just a simple value
    return value;
  }

  // ? mortal(SOCRATES).
  private parseQuery(): AST.Query {
    this.expect(TokenType.QUERY);
    const predicate = this.parsePredicateCall();
    this.expect(TokenType.DOT);

    return {
      type: 'Query',
      predicate,
    };
  }

  // X = "value"
  private parseAssignment(): AST.Assignment {
    const variable = this.advance().value;
    this.expect(TokenType.ASSIGN);
    const value = this.advance().value;

    return {
      type: 'Assignment',
      variable,
      value,
    };
  }

  private parseStringArray(): string[] {
    this.expect(TokenType.LBRACKET);
    const items: string[] = [];

    if (!this.check(TokenType.RBRACKET)) {
      items.push(this.expect(TokenType.STRING).value);

      while (this.check(TokenType.COMMA)) {
        this.advance();
        if (this.check(TokenType.RBRACKET)) break; // trailing comma
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

      while (this.check(TokenType.COMMA)) {
        this.advance();
        if (this.check(TokenType.RBRACKET)) break; // trailing comma
        items.push(this.advance().value);
      }
    }

    this.expect(TokenType.RBRACKET);
    return items;
  }
}
