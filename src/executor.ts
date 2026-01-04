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

const CUT_MARKER = '__CUT__';

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
      if (this.hasCut(nextSubst)) {
        yield* this.evaluateGoals(rest, nextSubst);
        return;
      }
      yield* this.evaluateGoals(rest, nextSubst);
    }
  }

  private async *evaluateCondition(condition: AST.Condition, subst: Substitution): AsyncGenerator<Substitution> {
    switch (condition.type) {
      case 'PredicateCall':
        yield* this.evaluatePredicate(condition, subst);
        return;
      case 'SemanticMatch': {
        const success = await this.evaluateSemanticMatch(condition, subst);
        if (success) yield subst;
        return;
      }
      case 'Equality': {
        if (condition.operator === '=') {
          const unified = this.unify(condition.left, condition.right, subst);
          if (unified) yield unified;
        } else {
          const left = this.deref(condition.left, subst);
          const right = this.deref(condition.right, subst);
          if (this.termsEqual(left, right)) yield subst;
        }
        return;
      }
      case 'Negation': {
        let succeeded = false;
        for await (const _ of this.evaluateGoals(condition.goals, subst)) {
          succeeded = true;
          break;
        }
        if (!succeeded) yield subst;
        return;
      }
      case 'Disjunction': {
        for await (const leftSubst of this.evaluateGoals(condition.left, subst)) {
          yield leftSubst;
          if (this.hasCut(leftSubst)) return;
        }
        for await (const rightSubst of this.evaluateGoals(condition.right, subst)) {
          yield rightSubst;
          if (this.hasCut(rightSubst)) return;
        }
        return;
      }
      case 'IfThenElse': {
        let thenSatisfied = false;
        for await (const condSubst of this.evaluateGoals(condition.condition, subst)) {
          thenSatisfied = true;
          for await (const thenSubst of this.evaluateGoals(condition.thenBranch, condSubst)) {
            yield thenSubst;
            if (this.hasCut(thenSubst)) return;
          }
          return;
        }
        if (!thenSatisfied) {
          for await (const elseSubst of this.evaluateGoals(condition.elseBranch, subst)) {
            yield elseSubst;
            if (this.hasCut(elseSubst)) return;
          }
        }
        return;
      }
      case 'Cut': {
        yield this.markCut(subst);
        return;
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

      for await (const result of this.evaluateGoals(freshRule.body, currentSubst)) {
        yield result;
        if (this.hasCut(result)) return;
      }
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
          return { type: 'List', elements: t.elements.map(renameTerm), tail: t.tail ? renameTerm(t.tail) : t.tail };
        case 'CompoundTerm':
          return { type: 'CompoundTerm', functor: t.functor, args: t.args.map(renameTerm) };
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
      case 'Negation':
        return { type: 'Negation', goals: cond.goals.map((g) => this.renameConditionVariables(g, rename)) };
      case 'Disjunction':
        return { type: 'Disjunction', left: cond.left.map((g) => this.renameConditionVariables(g, rename)), right: cond.right.map((g) => this.renameConditionVariables(g, rename)) };
      case 'IfThenElse':
        return {
          type: 'IfThenElse',
          condition: cond.condition.map((g) => this.renameConditionVariables(g, rename)),
          thenBranch: cond.thenBranch.map((g) => this.renameConditionVariables(g, rename)),
          elseBranch: cond.elseBranch.map((g) => this.renameConditionVariables(g, rename)),
        };
      case 'Cut':
        return { type: 'Cut' };
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
    if (t.type === 'Variable') return t.name === varName;
    if (t.type === 'List') {
      return t.elements.some((e) => this.occurs(varName, e, subst)) || (t.tail ? this.occurs(varName, t.tail, subst) : false);
    }
    if (t.type === 'CompoundTerm') return t.args.some((a) => this.occurs(varName, a, subst));
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
    return { type: 'StringLiteral', value: value.toString() } as AST.StringLiteral;
  }

  private async evaluateSemanticMatch(condition: AST.SemanticMatchCondition, subst: Substitution): Promise<boolean> {
    const leftVal = await this.termToValue(this.deref(condition.left, subst), subst);
    const rightVal = await this.termToValue(this.deref(condition.right, subst), subst);
    if (typeof leftVal === 'string' && typeof rightVal === 'string') return this.matcher.match(leftVal, rightVal);
    if (Array.isArray(leftVal) && typeof rightVal === 'string') return this.matcher.match(leftVal, rightVal);
    return false;
  }

  private async termToValue(term: AST.Term, subst: Substitution): Promise<string | string[] | null> {
    const t = this.resolveField(this.deref(term, subst), subst);
    switch (t.type) {
      case 'StringLiteral':
        return t.value;
      case 'Atom':
        return t.value;
      case 'List':
        return t.elements.map((e) => this.termToValueSync(e, subst)).map((v) => (v === null ? '' : String(v)));
      case 'Variable':
        return null;
      default:
        return null;
    }
  }

  private termToValueSync(term: AST.Term, subst: Substitution): string | null {
    const t = this.resolveField(this.deref(term, subst), subst);
    switch (t.type) {
      case 'StringLiteral':
        return t.value;
      case 'Atom':
        return t.value;
      default:
        return null;
    }
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
      case 'List': {
        const elements = t.elements.map((e) => this.termToString(e, subst));
        const tail = t.tail ? `| ${this.termToString(t.tail, subst)}` : '';
        return `[${elements.join(', ')}${tail ? ' ' + tail : ''}]`;
      }
      case 'CompoundTerm':
        return `${t.functor}(${t.args.map((a) => this.termToString(a, subst)).join(', ')})`;
      case 'FieldAccess':
        return `${t.object}.${t.field}`;
    }
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
        case 'FieldAccess':
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
        case 'Negation':
          cond.goals.forEach(visitCondition);
          break;
        case 'Disjunction':
          cond.left.forEach(visitCondition);
          cond.right.forEach(visitCondition);
          break;
        case 'IfThenElse':
          cond.condition.forEach(visitCondition);
          cond.thenBranch.forEach(visitCondition);
          cond.elseBranch.forEach(visitCondition);
          break;
        case 'Cut':
          break;
      }
    };

    goals.forEach(visitCondition);
    return Array.from(names);
  }

  private getFieldValue(objectName: string, fieldName: string): string | string[] | null {
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

  private hasCut(subst: Substitution): boolean {
    return subst.has(CUT_MARKER);
  }

  private markCut(subst: Substitution): Substitution {
    const next = new Map(subst);
    next.set(CUT_MARKER, { type: 'Atom', value: '!' } as AST.Atom);
    return next;
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

  getMatcher(): SemanticMatcher {
    return this.matcher;
  }
}
