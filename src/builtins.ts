import * as AST from './ast.js';
import type { Executor } from './executor';

export type Substitution = Map<string, AST.Term>;

export type BuiltinHandler = (
  args: AST.Term[],
  subst: Substitution,
  executor: Executor
) => AsyncGenerator<Substitution>;

export function runBuiltin(
  name: string,
  args: AST.Term[],
  subst: Substitution,
  executor: Executor
): AsyncGenerator<Substitution> | null {
  const handler = builtinTable[name];
  return handler ? handler(args, subst, executor) : null;
}

const builtinTable: Record<string, BuiltinHandler> = {
  print: async function* (args, subst, exec) {
    const rendered = args.map((a) => exec.termToString(exec.deref(a, subst), subst)).join(' ');
    exec.getOutputHandler()(rendered);
    yield subst;
  },
  println: async function* (args, subst, exec) {
    const rendered = args.map((a) => exec.termToString(exec.deref(a, subst), subst)).join(' ');
    exec.getOutputHandler()(rendered);
    yield subst;
  },
  nl: async function* (_args, subst, exec) {
    exec.getOutputHandler()('');
    yield subst;
  },
  read_line: async function* (args, subst, exec) {
    if (args.length !== 1) return;
    const target = exec.deref(args[0], subst);
    if (target.type !== 'Variable') return;
    const input = await exec.getInputHandler()('');
    const next = new Map(subst);
    next.set(target.name, { type: 'StringLiteral', value: input });
    yield next;
  },
  member: async function* (args, subst, exec) {
    if (args.length !== 2) return;
    const item = args[0];
    const listTerm = exec.deref(args[1], subst);
    if (listTerm.type !== 'List') return;
    for (const element of listTerm.elements) {
      const unified = exec.unify(item, element, subst);
      if (unified) yield unified;
    }
  },
  append: async function* (args, subst, exec) {
    if (args.length !== 3) return;
    const [a, b, result] = args.map((t) => exec.deref(t, subst));
    if (a.type === 'List' && b.type === 'List') {
      const elements = [...a.elements, ...b.elements];
      const list: AST.List = { type: 'List', elements, tail: null };
      const unified = exec.unify(result, list, subst);
      if (unified) yield unified;
    }
  },
  length: async function* (args, subst, exec) {
    if (args.length !== 2) return;
    const listTerm = exec.deref(args[0], subst);
    if (listTerm.type !== 'List') return;
    const len = listTerm.elements.length;
    const unified = exec.unify(args[1], { type: 'NumberLiteral', value: len }, subst);
    if (unified) yield unified;
  },
  nth: async function* (args, subst, exec) {
    if (args.length !== 3) return;
    const indexTerm = exec.deref(args[0], subst);
    const listTerm = exec.deref(args[1], subst);
    if (indexTerm.type !== 'NumberLiteral' || listTerm.type !== 'List') return;
    const idx = indexTerm.value - 1;
    if (idx < 0 || idx >= listTerm.elements.length) return;
    const unified = exec.unify(args[2], listTerm.elements[idx], subst);
    if (unified) yield unified;
  },
  reverse: async function* (args, subst, exec) {
    if (args.length !== 2) return;
    const listTerm = exec.deref(args[0], subst);
    if (listTerm.type !== 'List') return;
    const reversed: AST.List = { type: 'List', elements: [...listTerm.elements].reverse(), tail: null };
    const unified = exec.unify(args[1], reversed, subst);
    if (unified) yield unified;
  },
  findall: async function* (args, subst, exec) {
    if (args.length !== 3) return;
    const [template, goalTerm, listVar] = args;
    const goalCondition = termToGoal(goalTerm);
    const results: AST.Term[] = [];
    for await (const s of exec.evaluateGoals([goalCondition], new Map(subst))) {
      results.push(exec.deref(template, s));
    }
    const list: AST.List = { type: 'List', elements: results, tail: null };
    const unified = exec.unify(listVar, list, subst);
    if (unified) yield unified;
  },
  bagof: async function* (args, subst, exec) {
    yield* builtinTable.findall(args, subst, exec);
  },
  setof: async function* (args, subst, exec) {
    if (args.length !== 3) return;
    const [template, goalTerm, listVar] = args;
    const goalCondition = termToGoal(goalTerm);
    const results: string[] = [];
    const templTerms: AST.Term[] = [];
    for await (const s of exec.evaluateGoals([goalCondition], new Map(subst))) {
      const value = exec.termToString(exec.deref(template, s), s);
      results.push(value);
      templTerms.push(exec.deref(template, s));
    }
    const unique: AST.Term[] = [];
    const seen = new Set<string>();
    templTerms.forEach((t, i) => {
      if (!seen.has(results[i])) {
        seen.add(results[i]);
        unique.push(t);
      }
    });
    const list: AST.List = { type: 'List', elements: unique, tail: null };
    const unified = exec.unify(listVar, list, subst);
    if (unified) yield unified;
  },
};

function termToGoal(term: AST.Term): AST.Condition {
  if (term.type === 'CompoundTerm') {
    return { type: 'PredicateCall', name: term.functor, arguments: term.args };
  }
  if (term.type === 'Atom') {
    return { type: 'PredicateCall', name: term.value, arguments: [] };
  }
  throw new Error('Goal term must be a callable term');
}
