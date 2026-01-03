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
    return this.parseRuleOrAssignment();
  }

  private parseConceptDeclaration(): AST.ConceptDeclaration {
    this.expect(TokenType.CONCEPT);
    const name = this.expect(TokenType.CONSTANT).value;

    let genus: string | null = null;
    if (this.match(TokenType.COLON)) {
      genus = this.expect(TokenType.CONSTANT).value;
    }

    this.match(TokenType.DOT);

    let description: string | null = null;
    let attributes: string[] = [];
    let essentials: string[] = [];

    while (
      this.check(TokenType.DESCRIPTION) ||
      this.check(TokenType.ATTRIBUTES) ||
      this.check(TokenType.ESSENTIALS)
    ) {
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

    return { type: 'ConceptDeclaration', name, genus, description, attributes, essentials };
  }

  private parseEntityDeclaration(): AST.EntityDeclaration {
    this.expect(TokenType.ENTITY);
    const name = this.expect(TokenType.CONSTANT).value;
    this.expect(TokenType.COLON);
    const conceptType = this.expect(TokenType.CONSTANT).value;
    this.match(TokenType.DOT);

    let description: string | null = null;
    if (this.check(TokenType.DESCRIPTION)) {
      this.advance();
      this.expect(TokenType.ASSIGN);
      description = this.expect(TokenType.STRING).value;
    }

    return { type: 'EntityDeclaration', name, conceptType, description };
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
    const body = this.parseConditionList();
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
    const body = this.parseConditionList();
    this.match(TokenType.DOT);
    return { type: 'Query', body };
  }

  private parseConditionList(): AST.Condition[] {
    const conditions: AST.Condition[] = [];
    conditions.push(this.parseCondition());
    while (this.match(TokenType.COMMA)) {
      conditions.push(this.parseCondition());
    }
    return conditions;
  }

  private parseCondition(): AST.Condition {
    if (this.check(TokenType.IDENTIFIER) && this.peek(1).type === TokenType.LPAREN) {
      return this.parsePredicateCall();
    }

    const leftExpr = this.parseExpression();

    if (this.match(TokenType.SEMANTIC_MATCH)) {
      const right = this.parseExpression();
      return {
        type: 'SemanticMatch',
        left: this.expressionToTerm(leftExpr),
        right: this.expressionToTerm(right),
      };
    }

    if (this.match(TokenType.IS)) {
      const expr = this.parseExpression();
      return {
        type: 'ArithmeticEvaluation',
        target: this.expressionToTerm(leftExpr),
        expression: expr,
      };
    }

    const equalityToken = this.match(TokenType.EQUAL_EQUAL) || this.match(TokenType.ASSIGN);
    if (equalityToken) {
      const right = this.parseExpression();
      return {
        type: 'Equality',
        operator: equalityToken.type === TokenType.EQUAL_EQUAL ? '==' : '=',
        left: this.expressionToTerm(leftExpr),
        right: this.expressionToTerm(right),
      };
    }

    const comparisonToken =
      this.match(TokenType.LESS) ||
      this.match(TokenType.GREATER) ||
      this.match(TokenType.LESS_EQUAL) ||
      this.match(TokenType.GREATER_EQUAL) ||
      this.match(TokenType.EQUAL_NUM) ||
      this.match(TokenType.NOT_EQUAL_NUM);

    if (comparisonToken) {
      const right = this.parseExpression();
      let operator: AST.ComparisonCondition['operator'];
      switch (comparisonToken.type) {
        case TokenType.LESS:
          operator = '<';
          break;
        case TokenType.GREATER:
          operator = '>';
          break;
        case TokenType.LESS_EQUAL:
          operator = '=<';
          break;
        case TokenType.GREATER_EQUAL:
          operator = '>=';
          break;
        case TokenType.EQUAL_NUM:
          operator = '=:=';
          break;
        case TokenType.NOT_EQUAL_NUM:
          operator = '=\\=';
          break;
        default:
          throw new Error('Unknown comparison operator');
      }
      return {
        type: 'Comparison',
        operator,
        left: leftExpr,
        right,
      };
    }

    if (leftExpr.type === 'CompoundTerm') {
      return {
        type: 'PredicateCall',
        name: leftExpr.functor,
        arguments: leftExpr.args,
      };
    }

    throw new Error(`Unexpected condition at line ${this.peek().line}`);
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

  private parseExpression(): AST.Expression {
    return this.parseAdditive();
  }

  private parseAdditive(): AST.Expression {
    let expr = this.parseMultiplicative();
    while (true) {
      if (this.match(TokenType.PLUS)) {
        expr = { type: 'BinaryExpression', operator: '+', left: expr, right: this.parseMultiplicative() };
      } else if (this.match(TokenType.MINUS)) {
        expr = { type: 'BinaryExpression', operator: '-', left: expr, right: this.parseMultiplicative() };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseMultiplicative(): AST.Expression {
    let expr = this.parseExponent();
    while (true) {
      if (this.match(TokenType.STAR)) {
        expr = { type: 'BinaryExpression', operator: '*', left: expr, right: this.parseExponent() };
      } else if (this.match(TokenType.SLASH)) {
        expr = { type: 'BinaryExpression', operator: '/', left: expr, right: this.parseExponent() };
      } else if (this.match(TokenType.INT_DIV)) {
        expr = { type: 'BinaryExpression', operator: '//', left: expr, right: this.parseExponent() };
      } else if (this.match(TokenType.MOD)) {
        expr = { type: 'BinaryExpression', operator: 'mod', left: expr, right: this.parseExponent() };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseExponent(): AST.Expression {
    let expr = this.parseUnary();
    while (this.match(TokenType.CARET)) {
      expr = { type: 'BinaryExpression', operator: '^', left: expr, right: this.parseUnary() };
    }
    return expr;
  }

  private parseUnary(): AST.Expression {
    if (this.match(TokenType.MINUS)) {
      return { type: 'UnaryExpression', operator: '-', argument: this.parseUnary() };
    }
    if (this.match(TokenType.PLUS)) {
      return { type: 'UnaryExpression', operator: '+', argument: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AST.Expression {
    if (this.check(TokenType.NUMBER)) {
      const value = Number(this.advance().value);
      return { type: 'NumberLiteral', value };
    }

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
      return { type: 'Variable', name };
    }

    if (this.check(TokenType.CONSTANT)) {
      const value = this.advance().value;
      if (this.check(TokenType.DOT)) {
        this.advance();
        const field = this.advance().value;
        return { type: 'FieldAccess', object: value, field };
      }
      return { type: 'Atom', value };
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
    return this.expressionToTerm(this.parseExpression());
  }

  private expressionToTerm(expr: AST.Expression): AST.Term {
    return expr as AST.Term;
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
