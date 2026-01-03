import * as AST from './ast.js';
import { SemanticMatcher } from './semantic-matcher.js';
import { runBuiltin } from './builtins';

type Substitution = Map<string, AST.Term>;

type KnowledgeBase = {
  concepts: Map<string, AST.ConceptDeclaration>;
  entities: Map<string, AST.EntityDeclaration>;
  rules: AST.RuleDeclaration[];
};

export type OutputHandler = (message: string) => void;
export type InputHandler = (prompt?: string) => Promise<string>;

export class Executor {
  private kb: KnowledgeBase = {
    concepts: new Map(),
    entities: new Map(),
    rules: [],
  };
  private globalBindings: Substitution = new Map();
  private matcher: SemanticMatcher;
  private outputHandler: OutputHandler;
  private inputHandler: InputHandler;

  constructor(threshold = 0.7, outputHandler?: OutputHandler, inputHandler?: InputHandler) {
    this.matcher = new SemanticMatcher(threshold);
    this.outputHandler = outputHandler || ((msg) => console.log(msg));
    this.inputHandler = inputHandler || this.defaultInputHandler;
  }

  private async defaultInputHandler(prompt?: string): Promise<string> {
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(prompt || '', (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async execute(program: AST.Program): Promise<void> {
    this.kb = { concepts: new Map(), entities: new Map(), rules: [] };
    this.globalBindings = new Map();

    for (const statement of program.statements) {
      switch (statement.type) {
        case 'ConceptDeclaration':
          this.kb.concepts.set(statement.name, statement);
          break;
        case 'EntityDeclaration':
          this.kb.entities.set(statement.name, statement);
          break;
        case 'RuleDeclaration':
          this.kb.rules.push(statement);
          break;
        case 'Assignment': {
          this.globalBindings.set(statement.variable, { type: 'StringLiteral', value: statement.value });
          break;
        }
      }
    }

    for (const statement of program.statements) {
      if (statement.type === 'Query') {
        await this.executeQuery(statement);
      }
    }
  }

  private async executeQuery(query: AST.Query): Promise<void> {
    const initialSubst = new Map(this.globalBindings);
    let solutionCount = 0;

    for await (const solution of this.evaluateGoals(query.body, initialSubst)) {
      solutionCount++;
      this.outputSolution(solution, query.body);
    }

    if (solutionCount === 0) {
      this.outputHandler('False');
    } else {
      this.outputHandler('True');
    }
  }

  public async *evaluateGoals(goals: AST.Condition[], subst: Substitution): AsyncGenerator<Substitution> {
    if (goals.length === 0) {
      yield subst;
      return;
    }

    const [first, ...rest] = goals;
    for await (const nextSubst of this.evaluateCondition(first, subst)) {
      yield* this.evaluateGoals(rest, nextSubst);
    }
  }

  private async *evaluateCondition(condition: AST.Condition, subst: Substitution): AsyncGenerator<Substitution> {
    switch (condition.type) {
      case 'PredicateCall':
        yield* this.evaluatePredicate(condition, subst);
        break;
      case 'SemanticMatch': {
        const success = await this.evaluateSemanticMatch(condition, subst);
        if (success) {
          yield subst;
        }
        break;
      }
      case 'Equality': {
        if (condition.operator === '=') {
          const unified = this.unify(condition.left, condition.right, subst);
          if (unified) yield unified;
        } else {
          const left = this.deref(condition.left, subst);
          const right = this.deref(condition.right, subst);
          if (this.termsEqual(left, right)) {
            yield subst;
          }
        }
        break;
      }

      case 'Comparison': {
        const left = await this.evaluateExpression(condition.left, subst);
        const right = await this.evaluateExpression(condition.right, subst);
        const ok = this.compareValues(condition.operator, left, right);
        if (ok) yield subst;
        break;
      }
      case 'ArithmeticEvaluation': {
        const value = await this.evaluateExpression(condition.expression, subst);
        const targetTerm = this.deref(condition.target, subst);
        const resultSubst = this.unify(targetTerm, this.toNumberTerm(value), subst);
        if (resultSubst) yield resultSubst;
        break;
      }
    }
  }

  private async *evaluatePredicate(call: AST.PredicateCall, subst: Substitution): AsyncGenerator<Substitution> {
    const builtinResult = runBuiltin(call.name, call.arguments, subst, this);
    if (builtinResult) {
      yield* builtinResult;
      return;
    }

    for (const rule of this.kb.rules) {
      if (rule.head.name !== call.name) continue;
      if (rule.head.parameters.length !== call.arguments.length) continue;

      const freshRule = this.refreshRuleVariables(rule);
      let currentSubst: Substitution | null = new Map(subst);
      for (let i = 0; i < call.arguments.length; i++) {
        if (!currentSubst) break;
        currentSubst = this.unify(call.arguments[i], freshRule.head.parameters[i], currentSubst);
      }
      if (!currentSubst) continue;

      yield* this.evaluateGoals(freshRule.body, currentSubst);
    }
  }

  private refreshRuleVariables(rule: AST.RuleDeclaration): AST.RuleDeclaration {
    const suffix = `__${Math.random().toString(36).slice(2)}`;
    const renameTerm = (term: AST.Term): AST.Term => {
      const t = this.deref(term, new Map());
      switch (t.type) {
        case 'Variable':
          return { ...t, name: `${t.name}${suffix}` };
        case 'List':
          return {
            type: 'List',
            elements: t.elements.map(renameTerm),
            tail: t.tail ? renameTerm(t.tail) : t.tail,
          };
        case 'CompoundTerm':
          return { type: 'CompoundTerm', functor: t.functor, args: t.args.map(renameTerm) };
        case 'BinaryExpression':
          return { type: 'BinaryExpression', operator: t.operator, left: renameTerm(t.left), right: renameTerm(t.right) };
        case 'UnaryExpression':
          return { type: 'UnaryExpression', operator: t.operator, argument: renameTerm(t.argument) };
        default:
          return t;
      }
    };

    const head: AST.PredicateHead = {
      name: rule.head.name,
      parameters: rule.head.parameters.map(renameTerm),
    };

    const body = rule.body.map((cond) => this.renameConditionVariables(cond, renameTerm));
    return { type: 'RuleDeclaration', head, body };
  }

  private renameConditionVariables(cond: AST.Condition, rename: (term: AST.Term) => AST.Term): AST.Condition {
    switch (cond.type) {
      case 'PredicateCall':
        return { type: 'PredicateCall', name: cond.name, arguments: cond.arguments.map(rename) };
      case 'SemanticMatch':
        return { type: 'SemanticMatch', left: rename(cond.left), right: rename(cond.right) };
      case 'Equality':
        return { type: 'Equality', operator: cond.operator, left: rename(cond.left), right: rename(cond.right) };
      case 'Comparison':
        return {
          type: 'Comparison',
          operator: cond.operator,
          left: this.renameExpression(cond.left, rename),
          right: this.renameExpression(cond.right, rename),
        };
      case 'ArithmeticEvaluation':
        return { type: 'ArithmeticEvaluation', target: rename(cond.target), expression: this.renameExpression(cond.expression, rename) };
    }
  }

  private renameExpression(expr: AST.Expression, rename: (term: AST.Term) => AST.Term): AST.Expression {
    switch (expr.type) {
      case 'BinaryExpression':
        return { type: 'BinaryExpression', operator: expr.operator, left: this.renameExpression(expr.left, rename), right: this.renameExpression(expr.right, rename) };
      case 'UnaryExpression':
        return { type: 'UnaryExpression', operator: expr.operator, argument: this.renameExpression(expr.argument, rename) };
      default:
        return rename(expr as AST.Term);
    }
  }

  public deref(term: AST.Term, subst: Substitution): AST.Term {
    if (term.type === 'Variable' && !term.anonymous) {
      const bound = subst.get(term.name);
      if (bound) return this.deref(bound, subst);
    }
    return term;
  }

  private occurs(varName: string, term: AST.Term, subst: Substitution): boolean {
    const t = this.deref(term, subst);
    if (t.type === 'Variable') {
      return t.name === varName;
    }
    if (t.type === 'List') {
      return t.elements.some((e) => this.occurs(varName, e, subst)) || (t.tail ? this.occurs(varName, t.tail, subst) : false);
    }
    if (t.type === 'CompoundTerm') {
      return t.args.some((a) => this.occurs(varName, a, subst));
    }
    if (t.type === 'BinaryExpression') {
      return this.occurs(varName, t.left as AST.Term, subst) || this.occurs(varName, t.right as AST.Term, subst);
    }
    if (t.type === 'UnaryExpression') {
      return this.occurs(varName, t.argument as AST.Term, subst);
    }
    return false;
  }

  public unify(a: AST.Term, b: AST.Term, subst: Substitution): Substitution | null {
    const left = this.resolveField(this.deref(a, subst), subst);
    const right = this.resolveField(this.deref(b, subst), subst);

    if (left.type === 'Variable' && left.anonymous) return subst;
    if (right.type === 'Variable' && right.anonymous) return subst;

    if (left.type === 'Variable') {
      if (this.occurs(left.name, right, subst)) return null;
      const next = new Map(subst);
      next.set(left.name, right);
      return next;
    }
    if (right.type === 'Variable') {
      if (this.occurs(right.name, left, subst)) return null;
      const next = new Map(subst);
      next.set(right.name, left);
      return next;
    }

    if (left.type === 'Atom' && right.type === 'Atom') return left.value === right.value ? subst : null;
    if (left.type === 'StringLiteral' && right.type === 'StringLiteral') return left.value === right.value ? subst : null;
    if (left.type === 'NumberLiteral' && right.type === 'NumberLiteral') return left.value === right.value ? subst : null;

    if (left.type === 'List' && right.type === 'List') {
      if (left.elements.length > 0 && right.elements.length > 0) {
        const [h1, ...t1] = left.elements;
        const [h2, ...t2] = right.elements;
        const tail1 = left.tail ?? (t1.length ? { type: 'List', elements: t1, tail: null } as AST.List : null);
        const tail2 = right.tail ?? (t2.length ? { type: 'List', elements: t2, tail: null } as AST.List : null);
        const s1 = this.unify(h1, h2, subst);
        if (!s1) return null;
        const s2 = this.unify(tail1 || { type: 'List', elements: [], tail: null }, tail2 || { type: 'List', elements: [], tail: null }, s1);
        return s2;
      }
      if (!left.tail && !right.tail && left.elements.length === right.elements.length) {
        let current: Substitution | null = subst;
        for (let i = 0; i < left.elements.length; i++) {
          current = current && this.unify(left.elements[i], right.elements[i], current);
        }
        return current;
      }
      return null;
    }

    if (left.type === 'CompoundTerm' && right.type === 'CompoundTerm') {
      if (left.functor !== right.functor || left.args.length !== right.args.length) return null;
      let current: Substitution | null = subst;
      for (let i = 0; i < left.args.length; i++) {
        current = current && this.unify(left.args[i], right.args[i], current);
      }
      return current;
    }

    if (left.type === 'BinaryExpression' && right.type === 'BinaryExpression') {
      if (left.operator !== right.operator) return null;
      const s1 = this.unify(left.left as AST.Term, right.left as AST.Term, subst);
      if (!s1) return null;
      return this.unify(left.right as AST.Term, right.right as AST.Term, s1);
    }

    if (left.type === 'UnaryExpression' && right.type === 'UnaryExpression') {
      if (left.operator !== right.operator) return null;
      return this.unify(left.argument as AST.Term, right.argument as AST.Term, subst);
    }

    return null;
  }

  private termsEqual(a: AST.Term, b: AST.Term): boolean {
    if (a.type !== b.type) return false;
    switch (a.type) {
      case 'Variable':
        return b.type === 'Variable' && a.name === (b as AST.Variable).name;
      case 'Atom':
        return (b as AST.Atom).value === a.value;
      case 'StringLiteral':
        return (b as AST.StringLiteral).value === a.value;
      case 'NumberLiteral':
        return (b as AST.NumberLiteral).value === a.value;
      case 'List': {
        const lb = b as AST.List;
        if (a.elements.length !== lb.elements.length) return false;
        for (let i = 0; i < a.elements.length; i++) {
          if (!this.termsEqual(a.elements[i], lb.elements[i])) return false;
        }
        if (a.tail && lb.tail) return this.termsEqual(a.tail, lb.tail);
        return !a.tail && !lb.tail;
      }
      case 'CompoundTerm': {
        const cb = b as AST.CompoundTerm;
        if (a.functor !== cb.functor || a.args.length !== cb.args.length) return false;
        return a.args.every((arg, i) => this.termsEqual(arg, cb.args[i]));
      }
      case 'BinaryExpression': {
        const bb = b as AST.BinaryExpression;
        return a.operator === bb.operator && this.termsEqual(a.left as AST.Term, bb.left as AST.Term) && this.termsEqual(a.right as AST.Term, bb.right as AST.Term);
      }
      case 'UnaryExpression': {
        const ub = b as AST.UnaryExpression;
        return a.operator === ub.operator && this.termsEqual(a.argument as AST.Term, ub.argument as AST.Term);
      }
      case 'FieldAccess': {
        const fb = b as AST.FieldAccess;
        return a.object === fb.object && a.field === fb.field;
      }
    }
  }

  private resolveField(term: AST.Term, subst: Substitution): AST.Term {
    if (term.type !== 'FieldAccess') return term;
    const value = this.getFieldValue(term.object, term.field);
    if (value === null) return term;
    if (Array.isArray(value)) {
      return { type: 'List', elements: value.map((v) => ({ type: 'StringLiteral', value: v } as AST.StringLiteral)), tail: null };
    }
    return typeof value === 'number'
      ? ({ type: 'NumberLiteral', value } as AST.NumberLiteral)
      : ({ type: 'StringLiteral', value: value.toString() } as AST.StringLiteral);
  }

  private async evaluateSemanticMatch(condition: AST.SemanticMatchCondition, subst: Substitution): Promise<boolean> {
    const leftVal = await this.termToValue(this.deref(condition.left, subst), subst);
    const rightVal = await this.termToValue(this.deref(condition.right, subst), subst);
    if (typeof leftVal === 'string' && typeof rightVal === 'string') {
      return this.matcher.match(leftVal, rightVal);
    }
    if (Array.isArray(leftVal) && typeof rightVal === 'string') {
      return this.matcher.match(leftVal, rightVal);
    }
    return false;
  }

  private async termToValue(term: AST.Term, subst: Substitution): Promise<string | string[] | number | null> {
    const t = this.resolveField(this.deref(term, subst), subst);
    switch (t.type) {
      case 'StringLiteral':
        return t.value;
      case 'Atom':
        return t.value;
      case 'NumberLiteral':
        return t.value;
      case 'List':
        return t.elements.map((e) => this.termToValueSync(e, subst)).map((v) => (v === null ? '' : String(v)));
      case 'Variable':
        return null;
      default:
        return null;
    }
  }

  private termToValueSync(term: AST.Term, subst: Substitution): string | number | null {
    const t = this.resolveField(this.deref(term, subst), subst);
    switch (t.type) {
      case 'StringLiteral':
        return t.value;
      case 'Atom':
        return t.value;
      case 'NumberLiteral':
        return t.value;
      default:
        return null;
    }
  }

  public async evaluateExpression(expr: AST.Expression, subst: Substitution): Promise<number> {
    switch (expr.type) {
      case 'NumberLiteral':
        return expr.value;
      case 'StringLiteral': {
        const num = Number(expr.value);
        if (isNaN(num)) throw new Error(`Cannot convert string to number: ${expr.value}`);
        return num;
      }
      case 'Atom': {
        const num = Number(expr.value);
        if (isNaN(num)) throw new Error(`Cannot convert atom to number: ${expr.value}`);
        return num;
      }
      case 'Variable': {
        const resolved = this.deref(expr, subst);
        if (resolved.type === 'Variable') throw new Error(`Unbound variable ${expr.name}`);
        return this.evaluateExpression(resolved, subst);
      }
      case 'FieldAccess': {
        const resolved = this.resolveField(expr, subst);
        return this.evaluateExpression(resolved, subst);
      }
      case 'UnaryExpression': {
        const value = await this.evaluateExpression(expr.argument, subst);
        return expr.operator === '-' ? -value : value;
      }
      case 'BinaryExpression': {
        const left = await this.evaluateExpression(expr.left, subst);
        const right = await this.evaluateExpression(expr.right, subst);
        switch (expr.operator) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            return left / right;
          case '//':
            return Math.trunc(left / right);
          case 'mod':
            return left % right;
          case '^':
            return left ** right;
          default:
            throw new Error('Unknown operator');
        }
      }
      case 'List':
        return expr.elements.length;
      case 'CompoundTerm': {
        throw new Error('Cannot evaluate compound term as number');
      }
      default:
        throw new Error('Unknown expression type');
    }
  }

  private compareValues(op: AST.ComparisonCondition['operator'], left: number, right: number): boolean {
    switch (op) {
      case '<':
        return left < right;
      case '>':
        return left > right;
      case '=<':
        return left <= right;
      case '>=':
        return left >= right;
      case '=:=':
        return left === right;
      case '=\\=':
        return left !== right;
      default:
        return false;
    }
  }

  private toNumberTerm(value: number): AST.NumberLiteral {
    return { type: 'NumberLiteral', value };
  }

  private outputSolution(subst: Substitution, goals: AST.Condition[]): void {
    const variables = this.collectVariables(goals);
    const shown = variables.filter((v) => subst.has(v));
    if (shown.length === 0) {
      this.outputHandler('');
      return;
    }
    this.outputHandler('Bindings:');
    for (const name of shown) {
      const value = subst.get(name)!;
      this.outputHandler(`  ${name} = ${this.termToString(value, subst)}`);
    }
  }

  private collectVariables(goals: AST.Condition[]): string[] {
    const names = new Set<string>();
    const visitTerm = (term: AST.Term) => {
      switch (term.type) {
        case 'Variable':
          if (!term.anonymous) names.add(term.name);
          break;
        case 'List':
          term.elements.forEach(visitTerm);
          if (term.tail) visitTerm(term.tail);
          break;
        case 'CompoundTerm':
          term.args.forEach(visitTerm);
          break;
        case 'BinaryExpression':
          visitTerm(term.left as AST.Term);
          visitTerm(term.right as AST.Term);
          break;
        case 'UnaryExpression':
          visitTerm(term.argument as AST.Term);
          break;
        default:
          break;
      }
    };

    const visitCondition = (cond: AST.Condition) => {
      switch (cond.type) {
        case 'PredicateCall':
          cond.arguments.forEach(visitTerm);
          break;
        case 'SemanticMatch':
          visitTerm(cond.left);
          visitTerm(cond.right);
          break;
        case 'Equality':
          visitTerm(cond.left);
          visitTerm(cond.right);
          break;
        case 'Comparison':
          visitTerm(cond.left as AST.Term);
          visitTerm(cond.right as AST.Term);
          break;
        case 'ArithmeticEvaluation':
          visitTerm(cond.target);
          visitTerm(cond.expression as AST.Term);
          break;
      }
    };

    goals.forEach(visitCondition);
    return Array.from(names);
  }

  public termToString(term: AST.Term, subst: Substitution): string {
    const t = this.deref(term, subst);
    switch (t.type) {
      case 'Variable':
        return t.name;
      case 'Atom':
        return t.value;
      case 'StringLiteral':
        return `"${t.value}"`;
      case 'NumberLiteral':
        return String(t.value);
      case 'List': {
        const elements = t.elements.map((e) => this.termToString(e, subst));
        const tail = t.tail ? `| ${this.termToString(t.tail, subst)}` : '';
        return `[${elements.join(', ')}${tail ? ' ' + tail : ''}]`;
      }
      case 'CompoundTerm':
        return `${t.functor}(${t.args.map((a) => this.termToString(a, subst)).join(', ')})`;
      case 'FieldAccess':
        return `${t.object}.${t.field}`;
      case 'BinaryExpression':
        return `${this.termToString(t.left as AST.Term, subst)} ${t.operator} ${this.termToString(t.right as AST.Term, subst)}`;
      case 'UnaryExpression':
        return `${t.operator}${this.termToString(t.argument as AST.Term, subst)}`;
    }
  }

  private getFieldValue(objectName: string, fieldName: string): string | string[] | number | null {
    const concept = this.kb.concepts.get(objectName);
    if (concept) {
      if (fieldName === 'description' && concept.description) return concept.description;
      if (fieldName === 'genus' && concept.genus) return concept.genus;
      if (fieldName === 'attributes') return concept.attributes;
      if (fieldName === 'essentials') return concept.essentials;
    }

    const entity = this.kb.entities.get(objectName);
    if (entity) {
      if (fieldName === 'description' && entity.description) return entity.description;
      if (fieldName === 'concept' || fieldName === 'conceptType') return entity.conceptType;
      const entityConcept = this.kb.concepts.get(entity.conceptType);
      if (entityConcept) {
        if (fieldName === 'attributes') return entityConcept.attributes;
        if (fieldName === 'essentials') return entityConcept.essentials;
        if (fieldName === 'genus' && entityConcept.genus) return entityConcept.genus;
      }
    }

    return null;
  }

  getKnowledgeBase(): KnowledgeBase {
    return this.kb;
  }

  getInputHandler(): InputHandler {
    return this.inputHandler;
  }

  getOutputHandler(): OutputHandler {
    return this.outputHandler;
  }
}
