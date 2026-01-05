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
  readln: async function* (args, subst, exec) {
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
  reverse: async function* (args, subst, exec) {
    if (args.length !== 2) return;
    const listTerm = exec.deref(args[0], subst);
    if (listTerm.type !== 'List') return;
    const reversed: AST.List = { type: 'List', elements: [...listTerm.elements].reverse(), tail: null };
    const unified = exec.unify(args[1], reversed, subst);
    if (unified) yield unified;
  },
  is_list: async function* (args, subst, exec) {
    if (args.length !== 1) return;
    const t = exec.deref(args[0], subst);
    if (t.type === 'List') yield subst;
  },
  // Gradient similarity along an axis (less epistemologically pure, but useful)
  similar_attr: async function* (args, subst, exec) {
    if (args.length !== 3) return;
    const dim = exec.termToString(exec.deref(args[0], subst), subst).replace(/^"|"$/g, '');
    const a = exec.termToString(exec.deref(args[1], subst), subst).replace(/^"|"$/g, '');
    const b = exec.termToString(exec.deref(args[2], subst), subst).replace(/^"|"$/g, '');
    const ok = await exec.getMatcher().matchWithThreshold(a, b, dim);
    if (ok) yield subst;
  },

  // has_attr/2: Does this concrete possess this characteristic? (measurement-omission)
  has_attr: async function* (args, subst, exec) {
    if (args.length !== 2) return;
    const characteristic = exec.termToString(exec.deref(args[0], subst), subst).replace(/^"|"$/g, '');
    const concrete = exec.termToString(exec.deref(args[1], subst), subst).replace(/^"|"$/g, '');
    const ok = await exec.getMatcher().hasAttribute(characteristic, concrete);
    if (ok) yield subst;
  },

  // share_attr/3: Do both concretes possess this characteristic? (measurement-omission)
  share_attr: async function* (args, subst, exec) {
    if (args.length !== 3) return;
    const characteristic = exec.termToString(exec.deref(args[0], subst), subst).replace(/^"|"$/g, '');
    const a = exec.termToString(exec.deref(args[1], subst), subst).replace(/^"|"$/g, '');
    const b = exec.termToString(exec.deref(args[2], subst), subst).replace(/^"|"$/g, '');
    const ok = await exec.getMatcher().shareAttribute(characteristic, a, b);
    if (ok) yield subst;
  },

  // differentia/3: What distinguishes A from B? Binds result to third argument
  differentia: async function* (args, subst, exec) {
    if (args.length !== 3) return;
    const a = exec.termToString(exec.deref(args[0], subst), subst).replace(/^"|"$/g, '');
    const b = exec.termToString(exec.deref(args[1], subst), subst).replace(/^"|"$/g, '');
    const resultVar = exec.deref(args[2], subst);
    const differentia = await exec.getMatcher().getDifferentia(a, b);
    if (differentia) {
      const resultTerm: AST.StringLiteral = { type: 'StringLiteral', value: differentia };
      const unified = exec.unify(resultVar, resultTerm, subst);
      if (unified) yield unified;
    }
  },
  is_unbound: async function* (args, subst, exec) {
    if (args.length !== 1) return;
    const t = exec.deref(args[0], subst);
    if (t.type === 'Variable') yield subst;
  },
  is_bound: async function* (args, subst, exec) {
    if (args.length !== 1) return;
    const t = exec.deref(args[0], subst);
    if (t.type !== 'Variable') yield subst;
  },
  is_atom: async function* (args, subst, exec) {
    if (args.length !== 1) return;
    const t = exec.deref(args[0], subst);
    if (t.type === 'Atom' || t.type === 'StringLiteral') yield subst;
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
