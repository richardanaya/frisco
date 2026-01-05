var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/lexer.ts
var Lexer = class {
  constructor(input) {
    __publicField(this, "input");
    __publicField(this, "position", 0);
    __publicField(this, "line", 1);
    __publicField(this, "column", 1);
    this.input = input;
  }
  peek(offset = 0) {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : null;
  }
  advance() {
    const char = this.peek();
    if (char !== null) {
      this.position++;
      if (char === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    return char;
  }
  skipWhitespace() {
    while (this.peek() !== null && /[ \t\r\n]/.test(this.peek())) {
      this.advance();
    }
  }
  skipComment() {
    if (this.peek() === "#") {
      while (this.peek() !== null && this.peek() !== "\n") {
        this.advance();
      }
    }
  }
  readString() {
    let result = "";
    this.advance();
    while (this.peek() !== null && this.peek() !== '"') {
      if (this.peek() === "\\") {
        this.advance();
        const escaped = this.advance();
        if (escaped === "n")
          result += "\n";
        else if (escaped === "t")
          result += "	";
        else if (escaped === '"')
          result += '"';
        else if (escaped === "\\")
          result += "\\";
        else
          result += escaped ?? "";
      } else {
        result += this.advance();
      }
    }
    this.advance();
    return result;
  }
  readIdentifier() {
    let result = "";
    while (this.peek() !== null && /[a-zA-Z0-9_]/.test(this.peek())) {
      result += this.advance();
    }
    return result;
  }
  getKeywordOrIdentifier(text) {
    const keywords = {
      concept: "CONCEPT" /* CONCEPT */,
      entity: "ENTITY" /* ENTITY */,
      description: "DESCRIPTION" /* DESCRIPTION */,
      attributes: "ATTRIBUTES" /* ATTRIBUTES */,
      essentials: "ESSENTIALS" /* ESSENTIALS */,
      not: "NEGATION" /* NEGATION */
    };
    if (keywords[text]) {
      return keywords[text];
    }
    return "IDENTIFIER" /* IDENTIFIER */;
  }
  tokenize() {
    const tokens = [];
    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.peek() === "#") {
        this.skipComment();
        continue;
      }
      if (this.position >= this.input.length)
        break;
      const char = this.peek();
      const line = this.line;
      const column = this.column;
      if (char === '"') {
        const value = this.readString();
        tokens.push({ type: "STRING" /* STRING */, value, line, column });
        continue;
      }
      if (char === "=" && this.peek(1) === "~" && this.peek(2) === "=") {
        this.advance();
        this.advance();
        this.advance();
        tokens.push({ type: "SEMANTIC_MATCH" /* SEMANTIC_MATCH */, value: "=~=", line, column });
        continue;
      }
      if (char === ":" && this.peek(1) === "-") {
        this.advance();
        this.advance();
        tokens.push({ type: "IMPLIES" /* IMPLIES */, value: ":-", line, column });
        continue;
      }
      if (char === "-" && this.peek(1) === ">") {
        this.advance();
        this.advance();
        tokens.push({ type: "IF_THEN" /* IF_THEN */, value: "->", line, column });
        continue;
      }
      if (char === "=" && this.peek(1) === "=") {
        this.advance();
        this.advance();
        tokens.push({ type: "EQUAL_EQUAL" /* EQUAL_EQUAL */, value: "==", line, column });
        continue;
      }
      const single = {
        "=": "ASSIGN" /* ASSIGN */,
        "?": "QUERY" /* QUERY */,
        ".": "DOT" /* DOT */,
        ",": "COMMA" /* COMMA */,
        ":": "COLON" /* COLON */,
        "(": "LPAREN" /* LPAREN */,
        ")": "RPAREN" /* RPAREN */,
        "[": "LBRACKET" /* LBRACKET */,
        "]": "RBRACKET" /* RBRACKET */,
        "|": "BAR" /* BAR */,
        ";": "SEMICOLON" /* SEMICOLON */,
        "!": "CUT" /* CUT */
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
    tokens.push({ type: "EOF" /* EOF */, value: "", line: this.line, column: this.column });
    return tokens;
  }
};

// src/parser.ts
var Parser = class {
  constructor(tokens) {
    __publicField(this, "tokens");
    __publicField(this, "position", 0);
    this.tokens = tokens;
  }
  peek(offset = 0) {
    const pos = this.position + offset;
    return pos < this.tokens.length ? this.tokens[pos] : this.tokens[this.tokens.length - 1];
  }
  advance() {
    return this.tokens[this.position++];
  }
  check(type) {
    return this.peek().type === type;
  }
  match(...types) {
    if (types.includes(this.peek().type)) {
      return this.advance();
    }
    return null;
  }
  expect(type) {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} at line ${token.line}, column ${token.column}`);
    }
    return this.advance();
  }
  parse() {
    const statements = [];
    while (!this.check("EOF" /* EOF */)) {
      statements.push(this.parseStatement());
    }
    return { type: "Program", statements };
  }
  parseStatement() {
    if (this.check("CONCEPT" /* CONCEPT */))
      return this.parseConceptDeclaration();
    if (this.check("ENTITY" /* ENTITY */))
      return this.parseEntityDeclaration();
    if (this.check("QUERY" /* QUERY */))
      return this.parseQuery();
    if (this.check("IDENTIFIER" /* IDENTIFIER */) && this.peek(1).type === "LPAREN" /* LPAREN */) {
      const startPos = this.position;
      try {
        this.parsePredicateHead();
        if (this.check("DOT" /* DOT */)) {
          this.position = startPos;
          const head = this.parsePredicateHead();
          this.expect("DOT" /* DOT */);
          return { type: "RuleDeclaration", head, body: [] };
        } else {
          this.position = startPos;
        }
      } catch {
        this.position = startPos;
      }
    }
    return this.parseRuleOrAssignment();
  }
  parseConceptDeclaration() {
    this.expect("CONCEPT" /* CONCEPT */);
    const name = this.expect("IDENTIFIER" /* IDENTIFIER */).value;
    let genus = null;
    if (this.match("COLON" /* COLON */)) {
      if (this.check("IDENTIFIER" /* IDENTIFIER */) && this.peek(1).type === "COMMA" /* COMMA */) {
        genus = this.expect("IDENTIFIER" /* IDENTIFIER */).value;
        this.expect("COMMA" /* COMMA */);
      } else {
        genus = null;
      }
      let description = null;
      let attributes = [];
      let essentials = [];
      if (this.match("DESCRIPTION" /* DESCRIPTION */)) {
        this.expect("ASSIGN" /* ASSIGN */);
        description = this.expect("STRING" /* STRING */).value;
      } else if (this.match("ATTRIBUTES" /* ATTRIBUTES */)) {
        this.expect("ASSIGN" /* ASSIGN */);
        attributes = this.parseStringArray();
      } else if (this.match("ESSENTIALS" /* ESSENTIALS */)) {
        this.expect("ASSIGN" /* ASSIGN */);
        essentials = this.parseIdentifierOrStringArray();
      }
      while (this.match("COMMA" /* COMMA */)) {
        if (this.match("DESCRIPTION" /* DESCRIPTION */)) {
          this.expect("ASSIGN" /* ASSIGN */);
          description = this.expect("STRING" /* STRING */).value;
        } else if (this.match("ATTRIBUTES" /* ATTRIBUTES */)) {
          this.expect("ASSIGN" /* ASSIGN */);
          attributes = this.parseStringArray();
        } else if (this.match("ESSENTIALS" /* ESSENTIALS */)) {
          this.expect("ASSIGN" /* ASSIGN */);
          essentials = this.parseIdentifierOrStringArray();
        }
      }
      this.expect("DOT" /* DOT */);
      return { type: "ConceptDeclaration", name, genus, description, attributes, essentials };
    }
    this.match("DOT" /* DOT */);
    return { type: "ConceptDeclaration", name, genus: null, description: null, attributes: [], essentials: [] };
  }
  parseEntityDeclaration() {
    this.expect("ENTITY" /* ENTITY */);
    const name = this.expect("IDENTIFIER" /* IDENTIFIER */).value;
    this.expect("COLON" /* COLON */);
    const conceptType = this.expect("IDENTIFIER" /* IDENTIFIER */).value;
    let description = null;
    const properties = /* @__PURE__ */ new Map();
    if (this.match("COMMA" /* COMMA */)) {
      if (this.match("DESCRIPTION" /* DESCRIPTION */)) {
        this.expect("ASSIGN" /* ASSIGN */);
        description = this.expect("STRING" /* STRING */).value;
      } else if (this.check("IDENTIFIER" /* IDENTIFIER */)) {
        const propName = this.advance().value;
        this.expect("ASSIGN" /* ASSIGN */);
        const propValue = this.expect("STRING" /* STRING */).value;
        properties.set(propName, propValue);
      }
      while (this.match("COMMA" /* COMMA */)) {
        if (this.match("DESCRIPTION" /* DESCRIPTION */)) {
          this.expect("ASSIGN" /* ASSIGN */);
          description = this.expect("STRING" /* STRING */).value;
        } else if (this.check("IDENTIFIER" /* IDENTIFIER */)) {
          const propName = this.advance().value;
          this.expect("ASSIGN" /* ASSIGN */);
          const propValue = this.expect("STRING" /* STRING */).value;
          properties.set(propName, propValue);
        }
      }
    }
    this.match("DOT" /* DOT */);
    return { type: "EntityDeclaration", name, conceptType, description, properties };
  }
  parseRuleOrAssignment() {
    const first = this.peek();
    const second = this.peek(1);
    if (first.type === "IDENTIFIER" /* IDENTIFIER */ && second.type === "ASSIGN" /* ASSIGN */) {
      return this.parseAssignment();
    }
    return this.parseRuleDeclaration();
  }
  parseRuleDeclaration() {
    const head = this.parsePredicateHead();
    this.expect("IMPLIES" /* IMPLIES */);
    const body = this.parseGoalBody();
    this.match("DOT" /* DOT */);
    return { type: "RuleDeclaration", head, body };
  }
  parsePredicateHead() {
    const name = this.expect("IDENTIFIER" /* IDENTIFIER */).value;
    const parameters = [];
    if (this.match("LPAREN" /* LPAREN */)) {
      if (!this.check("RPAREN" /* RPAREN */)) {
        parameters.push(this.parseTerm());
        while (this.match("COMMA" /* COMMA */)) {
          parameters.push(this.parseTerm());
        }
      }
      this.expect("RPAREN" /* RPAREN */);
    }
    return { name, parameters };
  }
  parseQuery() {
    this.expect("QUERY" /* QUERY */);
    const body = this.parseGoalBody();
    this.match("DOT" /* DOT */);
    return { type: "Query", body };
  }
  parseGoalBody() {
    return this.parseDisjunction();
  }
  parseDisjunction() {
    let branches = [this.parseIfThenElse()];
    while (this.match("SEMICOLON" /* SEMICOLON */)) {
      branches.push(this.parseIfThenElse());
    }
    if (branches.length === 1)
      return branches[0];
    let acc = branches[0];
    for (let i = 1; i < branches.length; i++) {
      acc = [{ type: "Disjunction", left: acc, right: branches[i] }];
    }
    return acc;
  }
  parseIfThenElse() {
    const condSeq = this.parseConjunction();
    if (this.match("IF_THEN" /* IF_THEN */)) {
      const thenSeq = this.parseConjunction();
      let elseSeq = [];
      if (this.match("SEMICOLON" /* SEMICOLON */)) {
        elseSeq = this.parseConjunction();
      }
      return [{ type: "IfThenElse", condition: condSeq, thenBranch: thenSeq, elseBranch: elseSeq }];
    }
    return condSeq;
  }
  parseConjunction() {
    const seq = [];
    seq.push(this.parseAtomicCondition());
    while (this.match("COMMA" /* COMMA */)) {
      seq.push(this.parseAtomicCondition());
    }
    return seq;
  }
  parseAtomicCondition() {
    if (this.match("CUT" /* CUT */))
      return { type: "Cut" };
    if (this.match("NEGATION" /* NEGATION */)) {
      const goals = this.parseAtomicCondition();
      return { type: "Negation", goals: [goals] };
    }
    if (this.check("IDENTIFIER" /* IDENTIFIER */) && this.peek(1).type === "LPAREN" /* LPAREN */) {
      return this.parsePredicateCall();
    }
    const leftTerm = this.parseTerm();
    if (this.match("SEMANTIC_MATCH" /* SEMANTIC_MATCH */)) {
      const right = this.parseTerm();
      return { type: "SemanticMatch", left: leftTerm, right };
    }
    const equalityToken = this.match("EQUAL_EQUAL" /* EQUAL_EQUAL */) || this.match("ASSIGN" /* ASSIGN */);
    if (equalityToken) {
      const right = this.parseTerm();
      return {
        type: "Equality",
        operator: equalityToken.type === "EQUAL_EQUAL" /* EQUAL_EQUAL */ ? "==" : "=",
        left: leftTerm,
        right
      };
    }
    if (leftTerm.type === "CompoundTerm") {
      return { type: "PredicateCall", name: leftTerm.functor, arguments: leftTerm.args };
    }
    throw new Error(`Unexpected condition at line ${this.peek().line}, column ${this.peek().column}: unexpected token ${this.peek().type} '${this.peek().value}'`);
  }
  parsePredicateCall() {
    const name = this.expect("IDENTIFIER" /* IDENTIFIER */).value;
    this.expect("LPAREN" /* LPAREN */);
    const args = [];
    if (!this.check("RPAREN" /* RPAREN */)) {
      args.push(this.parseTerm());
      while (this.match("COMMA" /* COMMA */)) {
        args.push(this.parseTerm());
      }
    }
    this.expect("RPAREN" /* RPAREN */);
    return { type: "PredicateCall", name, arguments: args };
  }
  parseExpression() {
    return this.parsePrimary();
  }
  parsePrimary() {
    if (this.check("STRING" /* STRING */)) {
      const value = this.advance().value;
      return { type: "StringLiteral", value };
    }
    if (this.check("LBRACKET" /* LBRACKET */)) {
      return this.parseList();
    }
    if (this.check("IDENTIFIER" /* IDENTIFIER */)) {
      const name = this.advance().value;
      if (this.check("LPAREN" /* LPAREN */)) {
        this.advance();
        const args = [];
        if (!this.check("RPAREN" /* RPAREN */)) {
          args.push(this.parseTerm());
          while (this.match("COMMA" /* COMMA */)) {
            args.push(this.parseTerm());
          }
        }
        this.expect("RPAREN" /* RPAREN */);
        return { type: "CompoundTerm", functor: name, args };
      }
      if (this.check("DOT" /* DOT */)) {
        this.advance();
        const field = this.advance().value;
        return { type: "FieldAccess", object: name, field };
      }
      if (name === "_") {
        return { type: "Variable", name, anonymous: true };
      }
      if (/^[a-z]/.test(name)) {
        return { type: "Variable", name };
      }
      return { type: "Atom", value: name };
    }
    if (this.check("LPAREN" /* LPAREN */)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect("RPAREN" /* RPAREN */);
      return expr;
    }
    throw new Error(`Unexpected token ${this.peek().type} at line ${this.peek().line}, column ${this.peek().column}`);
  }
  parseTerm() {
    return this.parseExpression();
  }
  parseList() {
    this.expect("LBRACKET" /* LBRACKET */);
    const elements = [];
    let tail = null;
    if (!this.check("RBRACKET" /* RBRACKET */)) {
      elements.push(this.parseTerm());
      while (this.match("COMMA" /* COMMA */)) {
        elements.push(this.parseTerm());
      }
      if (this.match("BAR" /* BAR */)) {
        tail = this.parseTerm();
      }
    }
    this.expect("RBRACKET" /* RBRACKET */);
    return { type: "List", elements, tail };
  }
  parseAssignment() {
    const variable = this.expect("IDENTIFIER" /* IDENTIFIER */).value;
    this.expect("ASSIGN" /* ASSIGN */);
    const valueToken = this.advance();
    const value = valueToken.value;
    return { type: "Assignment", variable, value };
  }
  parseStringArray() {
    this.expect("LBRACKET" /* LBRACKET */);
    const items = [];
    if (!this.check("RBRACKET" /* RBRACKET */)) {
      items.push(this.expect("STRING" /* STRING */).value);
      while (this.match("COMMA" /* COMMA */)) {
        if (this.check("RBRACKET" /* RBRACKET */))
          break;
        items.push(this.expect("STRING" /* STRING */).value);
      }
    }
    this.expect("RBRACKET" /* RBRACKET */);
    return items;
  }
  parseIdentifierOrStringArray() {
    this.expect("LBRACKET" /* LBRACKET */);
    const items = [];
    if (!this.check("RBRACKET" /* RBRACKET */)) {
      const first = this.advance();
      items.push(first.value);
      while (this.match("COMMA" /* COMMA */)) {
        if (this.check("RBRACKET" /* RBRACKET */))
          break;
        items.push(this.advance().value);
      }
    }
    this.expect("RBRACKET" /* RBRACKET */);
    return items;
  }
};

// web/src/executor-web.ts
var CUT_MARKER = "__CUT__";
var ExecutorWeb = class {
  constructor(threshold, matcher2, outputHandler, inputHandler) {
    __publicField(this, "kb", {
      concepts: /* @__PURE__ */ new Map(),
      entities: /* @__PURE__ */ new Map(),
      rules: []
    });
    __publicField(this, "globalBindings", /* @__PURE__ */ new Map());
    __publicField(this, "matcher");
    __publicField(this, "outputHandler");
    __publicField(this, "inputHandler");
    __publicField(this, "printBuffer", "");
    this.matcher = matcher2;
    this.outputHandler = outputHandler;
    this.inputHandler = inputHandler;
  }
  async execute(program) {
    for (const statement of program.statements) {
      switch (statement.type) {
        case "ConceptDeclaration":
          this.kb.concepts.set(statement.name, statement);
          break;
        case "EntityDeclaration":
          this.kb.entities.set(statement.name, statement);
          break;
        case "RuleDeclaration":
          this.kb.rules.push(statement);
          break;
        case "Assignment": {
          this.globalBindings.set(statement.variable, { type: "StringLiteral", value: statement.value });
          break;
        }
      }
    }
    for (const statement of program.statements) {
      if (statement.type === "Query") {
        await this.executeQuery(statement);
      }
    }
    if (this.printBuffer) {
      this.outputHandler(this.printBuffer);
      this.printBuffer = "";
    }
  }
  async executeQuery(query) {
    const initialSubst = new Map(this.globalBindings);
    let solutionCount = 0;
    for await (const solution of this.evaluateGoals(query.body, initialSubst)) {
      solutionCount++;
      this.outputSolution(solution, query.body);
    }
    const hasSideEffects = query.body.some((condition) => {
      if (condition.type === "PredicateCall") {
        return ["print", "println", "readln"].includes(condition.name);
      }
      return false;
    });
    if (!hasSideEffects) {
      if (solutionCount === 0) {
        this.outputHandler("False");
      } else {
        this.outputHandler("True");
      }
    }
  }
  async *evaluateGoals(goals, subst) {
    if (goals.length === 0) {
      yield subst;
      return;
    }
    const [first, ...rest] = goals;
    for await (const nextSubst of this.evaluateCondition(first, subst)) {
      if (this.hasCut(nextSubst)) {
        yield* this.evaluateGoals(rest, nextSubst);
        return;
      }
      yield* this.evaluateGoals(rest, nextSubst);
    }
  }
  async *evaluateCondition(condition, subst) {
    switch (condition.type) {
      case "PredicateCall":
        yield* this.evaluatePredicate(condition, subst);
        return;
      case "SemanticMatch": {
        const success = await this.evaluateSemanticMatch(condition, subst);
        if (success)
          yield subst;
        return;
      }
      case "Equality": {
        if (condition.operator === "=") {
          const unified = this.unify(condition.left, condition.right, subst);
          if (unified)
            yield unified;
        } else {
          const left = this.deref(condition.left, subst);
          const right = this.deref(condition.right, subst);
          if (this.termsEqual(left, right))
            yield subst;
        }
        return;
      }
      case "Negation": {
        let succeeded = false;
        for await (const _ of this.evaluateGoals(condition.goals, subst)) {
          succeeded = true;
          break;
        }
        if (!succeeded)
          yield subst;
        return;
      }
      case "Disjunction": {
        for await (const leftSubst of this.evaluateGoals(condition.left, subst)) {
          yield leftSubst;
          if (this.hasCut(leftSubst))
            return;
        }
        for await (const rightSubst of this.evaluateGoals(condition.right, subst)) {
          yield rightSubst;
          if (this.hasCut(rightSubst))
            return;
        }
        return;
      }
      case "IfThenElse": {
        let thenSatisfied = false;
        for await (const condSubst of this.evaluateGoals(condition.condition, subst)) {
          thenSatisfied = true;
          for await (const thenSubst of this.evaluateGoals(condition.thenBranch, condSubst)) {
            yield thenSubst;
            if (this.hasCut(thenSubst))
              return;
          }
          return;
        }
        if (!thenSatisfied) {
          for await (const elseSubst of this.evaluateGoals(condition.elseBranch, subst)) {
            yield elseSubst;
            if (this.hasCut(elseSubst))
              return;
          }
        }
        return;
      }
      case "Cut": {
        yield this.markCut(subst);
        return;
      }
    }
  }
  async *evaluatePredicate(call, subst) {
    const builtinResult = this.runBuiltin(call.name, call.arguments, subst);
    if (builtinResult) {
      yield* builtinResult;
      return;
    }
    for (const rule of this.kb.rules) {
      if (rule.head.name !== call.name)
        continue;
      if (rule.head.parameters.length !== call.arguments.length)
        continue;
      const freshRule = this.refreshRuleVariables(rule);
      let currentSubst = new Map(subst);
      for (let i = 0; i < call.arguments.length; i++) {
        if (!currentSubst)
          break;
        currentSubst = this.unify(call.arguments[i], freshRule.head.parameters[i], currentSubst);
      }
      if (!currentSubst)
        continue;
      for await (const result of this.evaluateGoals(freshRule.body, currentSubst)) {
        yield result;
        if (this.hasCut(result))
          return;
      }
    }
  }
  runBuiltin(name, args, subst) {
    const self = this;
    switch (name) {
      case "print":
        return async function* () {
          const rendered = args.map((a) => self.termToPrintable(self.deref(a, subst), subst)).join("");
          self.printBuffer += rendered;
          yield subst;
        }();
      case "println":
        return async function* () {
          const rendered = args.map((a) => self.termToPrintable(self.deref(a, subst), subst)).join("");
          self.printBuffer += rendered;
          self.outputHandler(self.printBuffer);
          self.printBuffer = "";
          yield subst;
        }();
      case "readln":
        return async function* () {
          if (args.length !== 1)
            return;
          const target = self.deref(args[0], subst);
          if (target.type !== "Variable")
            return;
          const input = await self.inputHandler("");
          const next = new Map(subst);
          next.set(target.name, { type: "StringLiteral", value: input });
          yield next;
        }();
      case "member":
        return async function* () {
          if (args.length !== 2)
            return;
          const item = args[0];
          const listTerm = self.deref(args[1], subst);
          if (listTerm.type !== "List")
            return;
          for (const element of listTerm.elements) {
            const unified = self.unify(item, element, subst);
            if (unified)
              yield unified;
          }
        }();
      case "append":
        return async function* () {
          if (args.length !== 3)
            return;
          const [a, b, result] = args.map((t) => self.deref(t, subst));
          if (a.type === "List" && b.type === "List") {
            const elements = [...a.elements, ...b.elements];
            const list = { type: "List", elements, tail: null };
            const unified = self.unify(result, list, subst);
            if (unified)
              yield unified;
          }
        }();
      case "reverse":
        return async function* () {
          if (args.length !== 2)
            return;
          const listTerm = self.deref(args[0], subst);
          if (listTerm.type !== "List")
            return;
          const reversed = { type: "List", elements: [...listTerm.elements].reverse(), tail: null };
          const unified = self.unify(args[1], reversed, subst);
          if (unified)
            yield unified;
        }();
      case "is_list":
        return async function* () {
          if (args.length !== 1)
            return;
          const t = self.deref(args[0], subst);
          if (t.type === "List")
            yield subst;
        }();
      case "similar_attr":
        return async function* () {
          if (args.length !== 3)
            return;
          const dim = self.termToString(self.deref(args[0], subst), subst);
          const a = self.termToString(self.deref(args[1], subst), subst).replace(/^"|"$/g, "");
          const b = self.termToString(self.deref(args[2], subst), subst).replace(/^"|"$/g, "");
          const ok = await self.matcher.matchWithThreshold(a, b, dim);
          if (ok)
            yield subst;
        }();
      case "is_unbound":
        return async function* () {
          if (args.length !== 1)
            return;
          const t = self.deref(args[0], subst);
          if (t.type === "Variable")
            yield subst;
        }();
      case "is_bound":
        return async function* () {
          if (args.length !== 1)
            return;
          const t = self.deref(args[0], subst);
          if (t.type !== "Variable")
            yield subst;
        }();
      case "is_atom":
        return async function* () {
          if (args.length !== 1)
            return;
          const t = self.deref(args[0], subst);
          if (t.type === "Atom" || t.type === "StringLiteral")
            yield subst;
        }();
      case "findall":
        return async function* () {
          if (args.length !== 3)
            return;
          const [template, goalTerm, listVar] = args;
          const goalCondition = self.termToGoal(goalTerm);
          const results = [];
          for await (const s of self.evaluateGoals([goalCondition], new Map(subst))) {
            results.push(self.deref(template, s));
          }
          const list = { type: "List", elements: results, tail: null };
          const unified = self.unify(listVar, list, subst);
          if (unified)
            yield unified;
        }();
      case "setof":
        return async function* () {
          if (args.length !== 3)
            return;
          const [template, goalTerm, listVar] = args;
          const goalCondition = self.termToGoal(goalTerm);
          const results = [];
          const templTerms = [];
          for await (const s of self.evaluateGoals([goalCondition], new Map(subst))) {
            const value = self.termToString(self.deref(template, s), s);
            results.push(value);
            templTerms.push(self.deref(template, s));
          }
          const unique = [];
          const seen = /* @__PURE__ */ new Set();
          templTerms.forEach((t, i) => {
            if (!seen.has(results[i])) {
              seen.add(results[i]);
              unique.push(t);
            }
          });
          const list = { type: "List", elements: unique, tail: null };
          const unified = self.unify(listVar, list, subst);
          if (unified)
            yield unified;
        }();
      default:
        return null;
    }
  }
  termToGoal(term) {
    if (term.type === "CompoundTerm") {
      return { type: "PredicateCall", name: term.functor, arguments: term.args };
    }
    if (term.type === "Atom") {
      return { type: "PredicateCall", name: term.value, arguments: [] };
    }
    throw new Error("Goal term must be a callable term");
  }
  refreshRuleVariables(rule) {
    const suffix = `__${Math.random().toString(36).slice(2)}`;
    const renameTerm = (term) => {
      const t = this.deref(term, /* @__PURE__ */ new Map());
      switch (t.type) {
        case "Variable":
          return { ...t, name: `${t.name}${suffix}` };
        case "List":
          return { type: "List", elements: t.elements.map(renameTerm), tail: t.tail ? renameTerm(t.tail) : t.tail };
        case "CompoundTerm":
          return { type: "CompoundTerm", functor: t.functor, args: t.args.map(renameTerm) };
        default:
          return t;
      }
    };
    const head = {
      name: rule.head.name,
      parameters: rule.head.parameters.map(renameTerm)
    };
    const body = rule.body.map((cond) => this.renameConditionVariables(cond, renameTerm));
    return { type: "RuleDeclaration", head, body };
  }
  renameConditionVariables(cond, rename) {
    switch (cond.type) {
      case "PredicateCall":
        return { type: "PredicateCall", name: cond.name, arguments: cond.arguments.map(rename) };
      case "SemanticMatch":
        return { type: "SemanticMatch", left: rename(cond.left), right: rename(cond.right) };
      case "Equality":
        return { type: "Equality", operator: cond.operator, left: rename(cond.left), right: rename(cond.right) };
      case "Negation":
        return { type: "Negation", goals: cond.goals.map((g) => this.renameConditionVariables(g, rename)) };
      case "Disjunction":
        return { type: "Disjunction", left: cond.left.map((g) => this.renameConditionVariables(g, rename)), right: cond.right.map((g) => this.renameConditionVariables(g, rename)) };
      case "IfThenElse":
        return {
          type: "IfThenElse",
          condition: cond.condition.map((g) => this.renameConditionVariables(g, rename)),
          thenBranch: cond.thenBranch.map((g) => this.renameConditionVariables(g, rename)),
          elseBranch: cond.elseBranch.map((g) => this.renameConditionVariables(g, rename))
        };
      case "Cut":
        return { type: "Cut" };
    }
  }
  deref(term, subst) {
    if (term.type === "Variable" && !term.anonymous) {
      const bound = subst.get(term.name);
      if (bound)
        return this.deref(bound, subst);
    }
    return term;
  }
  occurs(varName, term, subst) {
    const t = this.deref(term, subst);
    if (t.type === "Variable")
      return t.name === varName;
    if (t.type === "List") {
      return t.elements.some((e) => this.occurs(varName, e, subst)) || (t.tail ? this.occurs(varName, t.tail, subst) : false);
    }
    if (t.type === "CompoundTerm")
      return t.args.some((a) => this.occurs(varName, a, subst));
    return false;
  }
  unify(a, b, subst) {
    const left = this.resolveField(this.deref(a, subst), subst);
    const right = this.resolveField(this.deref(b, subst), subst);
    if (left.type === "Variable" && left.anonymous)
      return subst;
    if (right.type === "Variable" && right.anonymous)
      return subst;
    if (left.type === "Variable") {
      if (this.occurs(left.name, right, subst))
        return null;
      const next = new Map(subst);
      next.set(left.name, right);
      return next;
    }
    if (right.type === "Variable") {
      if (this.occurs(right.name, left, subst))
        return null;
      const next = new Map(subst);
      next.set(right.name, left);
      return next;
    }
    if (left.type === "Atom" && right.type === "Atom")
      return left.value === right.value ? subst : null;
    if (left.type === "StringLiteral" && right.type === "StringLiteral")
      return left.value === right.value ? subst : null;
    if (left.type === "List" && right.type === "List") {
      if (left.elements.length > 0 && right.elements.length > 0) {
        const [h1, ...t1] = left.elements;
        const [h2, ...t2] = right.elements;
        const tail1 = left.tail ?? (t1.length ? { type: "List", elements: t1, tail: null } : null);
        const tail2 = right.tail ?? (t2.length ? { type: "List", elements: t2, tail: null } : null);
        const s1 = this.unify(h1, h2, subst);
        if (!s1)
          return null;
        const s2 = this.unify(tail1 || { type: "List", elements: [], tail: null }, tail2 || { type: "List", elements: [], tail: null }, s1);
        return s2;
      }
      if (!left.tail && !right.tail && left.elements.length === right.elements.length) {
        let current = subst;
        for (let i = 0; i < left.elements.length; i++) {
          current = current && this.unify(left.elements[i], right.elements[i], current);
        }
        return current;
      }
      return null;
    }
    if (left.type === "CompoundTerm" && right.type === "CompoundTerm") {
      if (left.functor !== right.functor || left.args.length !== right.args.length)
        return null;
      let current = subst;
      for (let i = 0; i < left.args.length; i++) {
        current = current && this.unify(left.args[i], right.args[i], current);
      }
      return current;
    }
    return null;
  }
  termsEqual(a, b) {
    if (a.type !== b.type)
      return false;
    switch (a.type) {
      case "Variable":
        return b.type === "Variable" && a.name === b.name;
      case "Atom":
        return b.value === a.value;
      case "StringLiteral":
        return b.value === a.value;
      case "List": {
        const lb = b;
        if (a.elements.length !== lb.elements.length)
          return false;
        for (let i = 0; i < a.elements.length; i++) {
          if (!this.termsEqual(a.elements[i], lb.elements[i]))
            return false;
        }
        if (a.tail && lb.tail)
          return this.termsEqual(a.tail, lb.tail);
        return !a.tail && !lb.tail;
      }
      case "CompoundTerm": {
        const cb = b;
        if (a.functor !== cb.functor || a.args.length !== cb.args.length)
          return false;
        return a.args.every((arg, i) => this.termsEqual(arg, cb.args[i]));
      }
      case "FieldAccess": {
        const fb = b;
        return a.object === fb.object && a.field === fb.field;
      }
    }
  }
  resolveField(term, subst) {
    if (term.type !== "FieldAccess")
      return term;
    const value = this.getFieldValue(term.object, term.field);
    if (value === null)
      return term;
    if (Array.isArray(value)) {
      return { type: "List", elements: value.map((v) => ({ type: "StringLiteral", value: v })), tail: null };
    }
    return { type: "StringLiteral", value: value.toString() };
  }
  async evaluateSemanticMatch(condition, subst) {
    const leftVal = await this.termToValue(this.deref(condition.left, subst), subst);
    const rightVal = await this.termToValue(this.deref(condition.right, subst), subst);
    if (typeof leftVal === "string" && typeof rightVal === "string")
      return this.matcher.match(leftVal, rightVal);
    if (Array.isArray(leftVal) && typeof rightVal === "string")
      return this.matcher.match(leftVal, rightVal);
    return false;
  }
  async termToValue(term, subst) {
    const t = this.resolveField(this.deref(term, subst), subst);
    switch (t.type) {
      case "StringLiteral":
        return t.value;
      case "Atom":
        return t.value;
      case "List":
        return t.elements.map((e) => this.termToValueSync(e, subst)).map((v) => v === null ? "" : String(v));
      case "Variable":
        return null;
      default:
        return null;
    }
  }
  termToValueSync(term, subst) {
    const t = this.resolveField(this.deref(term, subst), subst);
    switch (t.type) {
      case "StringLiteral":
        return t.value;
      case "Atom":
        return t.value;
      default:
        return null;
    }
  }
  termToString(term, subst) {
    const t = this.deref(term, subst);
    switch (t.type) {
      case "Variable":
        return t.name;
      case "Atom":
        return t.value;
      case "StringLiteral":
        return `"${t.value}"`;
      case "List": {
        const elements = t.elements.map((e) => this.termToString(e, subst));
        const tail = t.tail ? `| ${this.termToString(t.tail, subst)}` : "";
        return `[${elements.join(", ")}${tail ? " " + tail : ""}]`;
      }
      case "CompoundTerm":
        return `${t.functor}(${t.args.map((a) => this.termToString(a, subst)).join(", ")})`;
      case "FieldAccess":
        return `${t.object}.${t.field}`;
    }
  }
  // For print/println - outputs raw values without quotes
  termToPrintable(term, subst) {
    const t = this.deref(term, subst);
    switch (t.type) {
      case "Variable":
        return t.name;
      case "Atom":
        return t.value;
      case "StringLiteral":
        return t.value;
      case "List": {
        const elements = t.elements.map((e) => this.termToPrintable(e, subst));
        return `[${elements.join(", ")}]`;
      }
      case "CompoundTerm":
        return `${t.functor}(${t.args.map((a) => this.termToPrintable(a, subst)).join(", ")})`;
      case "FieldAccess":
        return `${t.object}.${t.field}`;
    }
  }
  outputSolution(subst, goals) {
    const variables = this.collectVariables(goals);
    const shown = variables.filter((v) => subst.has(v));
    if (shown.length === 0) {
      return;
    }
    this.outputHandler("Bindings:");
    for (const name of shown) {
      const value = subst.get(name);
      this.outputHandler(`  ${name} = ${this.termToString(value, subst)}`);
    }
  }
  collectVariables(goals) {
    const names = /* @__PURE__ */ new Set();
    const visitTerm = (term) => {
      switch (term.type) {
        case "Variable":
          if (!term.anonymous)
            names.add(term.name);
          break;
        case "List":
          term.elements.forEach(visitTerm);
          if (term.tail)
            visitTerm(term.tail);
          break;
        case "CompoundTerm":
          term.args.forEach(visitTerm);
          break;
        case "FieldAccess":
          break;
      }
    };
    const visitCondition = (cond) => {
      switch (cond.type) {
        case "PredicateCall":
          cond.arguments.forEach(visitTerm);
          break;
        case "SemanticMatch":
          visitTerm(cond.left);
          visitTerm(cond.right);
          break;
        case "Equality":
          visitTerm(cond.left);
          visitTerm(cond.right);
          break;
        case "Negation":
          cond.goals.forEach(visitCondition);
          break;
        case "Disjunction":
          cond.left.forEach(visitCondition);
          cond.right.forEach(visitCondition);
          break;
        case "IfThenElse":
          cond.condition.forEach(visitCondition);
          cond.thenBranch.forEach(visitCondition);
          cond.elseBranch.forEach(visitCondition);
          break;
        case "Cut":
          break;
      }
    };
    goals.forEach(visitCondition);
    return Array.from(names);
  }
  getFieldValue(objectName, fieldName) {
    const concept = this.kb.concepts.get(objectName);
    if (concept) {
      if (fieldName === "description" && concept.description)
        return concept.description;
      if (fieldName === "genus" && concept.genus)
        return concept.genus;
      if (fieldName === "attributes")
        return concept.attributes;
      if (fieldName === "essentials")
        return concept.essentials;
    }
    const entity = this.kb.entities.get(objectName);
    if (entity) {
      if (fieldName === "description" && entity.description)
        return entity.description;
      if (fieldName === "concept" || fieldName === "conceptType")
        return entity.conceptType;
      if (entity.properties && entity.properties.has(fieldName)) {
        return entity.properties.get(fieldName);
      }
      const entityConcept = this.kb.concepts.get(entity.conceptType);
      if (entityConcept) {
        if (fieldName === "attributes")
          return entityConcept.attributes;
        if (fieldName === "essentials")
          return entityConcept.essentials;
        if (fieldName === "genus" && entityConcept.genus)
          return entityConcept.genus;
      }
    }
    return null;
  }
  hasCut(subst) {
    return subst.has(CUT_MARKER);
  }
  markCut(subst) {
    const next = new Map(subst);
    next.set(CUT_MARKER, { type: "Atom", value: "!" });
    return next;
  }
  getMatcher() {
    return this.matcher;
  }
};

// web/src/semantic-matcher-web.ts
var SYSTEM_PROMPT = `You are measuring attribute similarity for concept formation.

Given an axis (a measurable attribute) and two concretes, determine how similar they are along ONLY that axis, ignoring all other properties.

This follows measurement-omission: concepts group concretes that share an attribute while differing in its measurement. You are measuring whether two concretes HAVE the attribute and how comparable their measurements are.

Scoring:
- 1.0: Same or nearly identical measurement on this axis
- 0.7-0.9: Clearly comparable, same general range
- 0.4-0.6: Both possess the attribute but measurements differ significantly
- 0.1-0.3: One possesses the attribute weakly or metaphorically
- 0.0: One or both lack this attribute entirely

Respond with ONLY a decimal number between 0 and 1.`;
var SemanticMatcherWeb = class {
  constructor(threshold = 0.7, endpoint = "http://localhost:9090") {
    __publicField(this, "threshold");
    __publicField(this, "endpoint");
    this.threshold = threshold;
    this.endpoint = endpoint;
  }
  async initialize(onProgress) {
    if (onProgress) {
      onProgress({ status: "ready", progress: 100 });
    }
  }
  async getSimilarityScore(axis, concrete1, concrete2) {
    const userMessage = `Axis: ${axis}
Concrete 1: ${concrete1}
Concrete 2: ${concrete2}`;
    try {
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "similarity_score",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  similarity: { type: "number" }
                },
                required: ["similarity"],
                additionalProperties: false
              }
            }
          }
        })
      });
      if (!response.ok) {
        console.error(`LLM judge request failed: ${response.status} ${response.statusText}`);
        return 0;
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error("No content in LLM response");
        return 0;
      }
      const parsed = JSON.parse(content);
      const similarity = Math.max(0, Math.min(1, parsed.similarity));
      console.log(`LLM judge similarity for "${axis}" between "${concrete1}" and "${concrete2}": ${similarity.toFixed(4)}`);
      return similarity;
    } catch (error) {
      console.error("Error calling LLM judge:", error);
      return 0;
    }
  }
  async match(left, right) {
    const axis = "conceptual identity";
    if (typeof left === "string") {
      const similarity = await this.getSimilarityScore(axis, left, right);
      console.log(`Similarity between "${left}" and "${right}": ${similarity.toFixed(4)}`);
      return similarity >= this.threshold;
    } else {
      for (const item of left) {
        const similarity = await this.getSimilarityScore(axis, item, right);
        console.log(`Similarity between "${item}" and "${right}": ${similarity.toFixed(4)}`);
        if (similarity >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }
  async getSimilarity(left, right) {
    const similarity = await this.getSimilarityScore("conceptual identity", left, right);
    console.log(`Similarity between "${left}" and "${right}": ${similarity.toFixed(4)}`);
    return similarity;
  }
  async matchWithThreshold(left, right, dim) {
    const axis = dim || "conceptual identity";
    if (typeof left === "string") {
      const similarity = await this.getSimilarityScore(axis, left, right);
      console.log(`Similarity for "${axis}" between "${left}" and "${right}": ${similarity.toFixed(4)}`);
      return similarity >= this.threshold;
    } else {
      for (const item of left) {
        const similarity = await this.getSimilarityScore(axis, item, right);
        console.log(`Similarity for "${axis}" between "${item}" and "${right}": ${similarity.toFixed(4)}`);
        if (similarity >= this.threshold) {
          return true;
        }
      }
      return false;
    }
  }
};

// web/src/frisco-web.ts
var executor = null;
var matcher = null;
var isReady = false;
var outputEl = document.getElementById("output");
var inputEl = document.getElementById("input");
var runBtn = document.getElementById("run");
var statusEl = document.getElementById("status");
var progressEl = document.getElementById("model-progress");
var progressTextEl = document.getElementById("progress-text");
var progressFillEl = document.getElementById("progress-fill");
function splitStatements(source) {
  const statements = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && (i === 0 || source[i - 1] !== "\\")) {
      inString = !inString;
      current += char;
    } else if (char === "." && !inString && (i + 1 >= source.length || source[i + 1] === " " || source[i + 1] === "\n" || source[i + 1] === "	")) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements;
}
function appendOutput(text, className = "") {
  const line = document.createElement("div");
  line.className = `output-line ${className}`;
  line.textContent = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}
async function initializeMatcher() {
  matcher = new SemanticMatcherWeb(0.7);
  progressEl.classList.add("visible");
  await matcher.initialize((progress) => {
    if (progress.status === "progress" && progress.progress !== void 0) {
      const percent = Math.round(progress.progress);
      progressFillEl.style.width = `${percent}%`;
      progressTextEl.textContent = `Downloading BGE-M3 model... ${percent}%`;
    } else if (progress.status === "done") {
      progressTextEl.textContent = "BGE-M3 model loaded!";
    } else if (progress.status === "ready") {
      progressEl.classList.remove("visible");
    }
  });
  progressEl.classList.remove("visible");
}
async function initialize() {
  try {
    appendOutput("Initializing BGE-M3 embedding model (first load may take a moment)...", "info");
    await initializeMatcher();
    executor = new ExecutorWeb(
      0.7,
      matcher,
      (msg) => appendOutput(msg, "result"),
      async (prompt) => {
        return new Promise((resolve) => {
          const result = window.prompt(prompt || "Enter input:");
          resolve(result || "");
        });
      }
    );
    isReady = true;
    statusEl.textContent = "Ready";
    statusEl.className = "ready";
    inputEl.disabled = false;
    runBtn.disabled = false;
    appendOutput("Ready! Enter Frisco code below.", "info");
  } catch (error) {
    statusEl.textContent = "Error";
    statusEl.className = "error";
    appendOutput(`Failed to initialize: ${error}`, "error");
  }
}
async function runCode(source) {
  if (!isReady || !executor) {
    appendOutput("Not ready yet. Please wait for initialization.", "error");
    return;
  }
  let processedSource = source.trim();
  const statements = splitStatements(processedSource);
  const processedStatements = statements.map((stmt) => {
    stmt = stmt.trim();
    if (!stmt)
      return "";
    const isDeclaration = stmt.startsWith("?") || stmt.startsWith("concept ") || stmt.startsWith("entity ") || stmt.includes(":-");
    const looksLikeQuery = /^[a-z_][a-zA-Z0-9_]*\s*\(/.test(stmt) || // predicate call
    stmt.includes("=~=") || // semantic match
    /^".*"/.test(stmt) || // starts with string
    /^\[/.test(stmt);
    if (!isDeclaration && looksLikeQuery) {
      return "? " + stmt + ".";
    }
    return stmt + ".";
  });
  processedSource = processedStatements.filter((s) => s).join(" ");
  appendOutput(source, "input");
  try {
    const lexer = new Lexer(processedSource);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    await executor.execute(ast);
  } catch (error) {
    if (error instanceof Error) {
      appendOutput(`Error: ${error.message}`, "error");
    } else {
      appendOutput(`Error: ${error}`, "error");
    }
  }
}
runBtn.addEventListener("click", () => {
  const code = inputEl.value.trim();
  if (code) {
    runCode(code);
    inputEl.value = "";
  }
});
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const code = inputEl.value.trim();
    if (code) {
      runCode(code);
      inputEl.value = "";
    }
  }
});
document.querySelectorAll(".example-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const code = btn.getAttribute("data-code");
    if (code) {
      inputEl.value = code;
      inputEl.focus();
    }
  });
});
initialize();
//# sourceMappingURL=frisco-web.js.map
