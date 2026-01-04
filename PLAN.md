# Recommendations to Make Frisco More Prolog-like and Functional

## Executive Summary

Frisco is currently a **semantic knowledge base query system** with fuzzy matching capabilities, rather than a full logic programming language. It implements approximately 15-20% of Prolog's capabilities. While it has a unique and innovative semantic matching feature using embeddings, it lacks most core Prolog features including proper unification, backtracking, lists, arithmetic, and compound terms.

**Current State:**
- ✅ Concept/entity ontology with hierarchies
- ✅ Semantic matching via embeddings (=~=)
- ✅ Simple rules with single-solution evaluation
- ✅ Basic I/O predicates
- ✅ Variable assignments
- ❌ No proper unification
- ❌ No backtracking for multiple solutions
- ❌ No lists or list processing
- ❌ No arithmetic or numbers
- ❌ No compound terms/functors
- ❌ No negation or cut
- ❌ No meta-predicates (findall, assert, retract)

## Critical Features for Prolog-like Functionality

### 1. Implement Proper Unification

**Current:** Simple one-way parameter binding (arguments → parameters)
**Needed:** True bidirectional unification with occurs check

**Why Critical:** Unification is the foundation of logic programming. Without it, Frisco can't do pattern matching or reason about structural equality.

**Implementation:**
- Add unification algorithm in executor
- Support compound term matching
- Implement occurs check to prevent infinite structures
- Enable bidirectional variable binding (X = Y where both unbound)
- Add exact equality operator (== or =) alongside semantic match (=~=)

**Impact:** Enables rules like `same(X, X)` and structural pattern matching

### 2. Add List Support with Pattern Matching

**Current:** String arrays only exist as concept properties, cannot be manipulated
**Needed:** First-class lists with [Head|Tail] syntax and list predicates

**Why Critical:** Lists are fundamental to functional and logic programming. Most Prolog programs use lists extensively.

**Implementation:**
- Add list syntax to lexer/parser: `[1, 2, 3]` and `[H|T]`
- Add List AST node type
- Implement list unification with head/tail decomposition
- Add built-in list predicates:
  - `append(L1, L2, L3)` - concatenate lists
  - `member(X, List)` - check membership
  - `length(List, N)` - get list length
  - `nth(N, List, Element)` - access by index
  - `reverse(List, Reversed)` - reverse a list

**Example Usage:**
```frisco
append([], L, L).
append([H|T1], L2, [H|T3]) :- append(T1, L2, T3).

? append([1, 2], [3, 4], Result).
Result = [1, 2, 3, 4]
```

### 3. Add Numbers and Arithmetic

**Current:** No numeric types or arithmetic operators
**Needed:** Integers, floats, and arithmetic evaluation

**Why Critical:** Many practical logic programs need arithmetic (counting, calculations, indexing).

**Implementation:**
- Add NUMBER token type to lexer
- Add numeric literals to AST (IntegerLiteral, FloatLiteral)
- Add arithmetic operators to lexer: +, -, *, /, mod, //, ^
- Add comparison operators: <, >, =<, >=, ==, =/=
- Add `is/2` operator for arithmetic evaluation
- Support arithmetic in rule bodies

**Example Usage:**
```frisco
factorial(0, 1).
factorial(N, F) :-
  N > 0,
  N1 is N - 1,
  factorial(N1, F1),
  F is N * F1.

? factorial(5, Result).
Result = 120
```

### 4. Implement Full Backtracking with Multiple Solutions

**Current:** Single-solution evaluation (returns first match only)
**Needed:** Explore all solutions via backtracking

**Why Critical:** Generating all solutions is a core Prolog capability. Needed for queries like "find all people" or "enumerate possibilities."

**Implementation:**
- Modify executor to support backtracking through rule alternatives
- Add solution iteration (instead of returning first True/False)
- Implement choice points for backtracking
- Add meta-predicates for solution collection:
  - `findall(Template, Goal, List)` - find all solutions
  - `bagof(Template, Goal, List)` - find all solutions with duplicates
  - `setof(Template, Goal, List)` - find all unique solutions, sorted

**Example Usage:**
```frisco
concept Person.
entity SOCRATES: Person.
entity PLATO: Person.
entity ARISTOTLE: Person.

? findall(X, X.concept == "Person", People).
People = [SOCRATES, PLATO, ARISTOTLE]
```

**Current Output:**
```
True
Bindings:
  X = SOCRATES
```

**Desired Output:**
```
X = SOCRATES ;
X = PLATO ;
X = ARISTOTLE ;
True
```

## High-Priority Improvements

### 5. Add Compound Terms/Functors

**Current:** Flat structures only (concepts, entities, strings)
**Needed:** Arbitrary nested structures

**Why Important:** Enables representing complex data like trees, graphs, parse trees.

**Implementation:**
- Add functor syntax: `term(arg1, arg2, ...)`
- Add CompoundTerm AST node
- Support compound terms in arguments and rule heads
- Enable unification on compound terms

**Example:**
```frisco
parent(john, mary).
parent(john, bob).
parent(mary, alice).

grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

? grandparent(john, alice).
True
```

### 6. Add Negation (Negation as Failure)

**Current:** No negation operator
**Needed:** `not` operator

**Why Important:** Expressing "not a member" or "doesn't have property" is common.

**Implementation:**
- Add NOT token to lexer
- Add Negation condition type to AST
- Implement negation as failure: `not(Goal)` succeeds if Goal fails
- Handle cut interactions properly

**Example:**
```frisco
mortal(X) :- man(X), not(immortal(X)).
```

### 7. Add Cut Operator (!)

**Current:** No backtracking control
**Needed:** Cut to prevent exploring alternatives

**Why Important:** Efficiency and expressing deterministic rules.

**Implementation:**
- Add CUT token (!)
- Add Cut condition type
- Implement choice point removal on cut

**Example:**
```frisco
max(X, Y, X) :- X >= Y, !.
max(X, Y, Y).
```

### 8. Add Anonymous Variables (_)

**Current:** All variables must be named
**Needed:** Anonymous variable for "don't care" values

**Why Important:** Cleaner syntax and avoiding unused variable warnings.

**Implementation:**
- Recognize _ as special token
- Don't bind anonymous variables
- Each _ is independent

**Example:**
```frisco
first([H|_], H).
```

## Medium-Priority Enhancements

### 9. Add String Manipulation Predicates

**Current:** Only semantic matching on strings
**Needed:** String operations

**Implementation:**
- `atom_concat(A1, A2, A3)` - concatenate
- `atom_length(A, Len)` - length
- `sub_atom(Atom, Before, Length, After, Sub)` - substring
- `atom_chars(Atom, Chars)` - convert to character list

### 10. Add Type Checking Predicates

**Current:** No runtime type checking
**Needed:** Type inspection predicates

**Implementation:**
- `is_unbound(X)` - check if unbound variable
- `is_bound(X)` - check if bound
- `is_atom(X)` - check if atom/string
- `is_number(X)` - check if number
- `is_list(X)` - check if list
- `concept(X)` - check if concept (Frisco-specific)
- `entity(X)` - check if entity (Frisco-specific)

### 11. Add Dynamic Knowledge Base (assert/retract)

**Current:** Static KB after loading
**Needed:** Runtime fact/rule modification

**Implementation:**
- `assert(Fact)` - add fact
- `retract(Fact)` - remove fact
- `asserta(Fact)` - add at beginning
- `assertz(Fact)` - add at end
- `retractall(Pattern)` - remove all matching

### 12. Add Disjunction (OR)

**Current:** Only conjunction (AND) with commas
**Needed:** Disjunction operator (semicolon)

**Implementation:**
- Add semicolon (;) as OR operator
- Support in rule bodies: `(A ; B)`
- Implement backtracking through alternatives

**Example:**
```frisco
greek_philosopher(X) :-
  (X == "Socrates" ; X == "Plato" ; X == "Aristotle").
```

### 13. Add If-Then-Else

**Current:** No conditional construct
**Needed:** If-then-else operator (->)

**Implementation:**
- Add `(Condition -> Then ; Else)` syntax
- Implement cut-like behavior after Then succeeds

**Example:**
```frisco
abs(X, X) :- X >= 0, !.
abs(X, Y) :- Y is -X.

# Or with if-then-else:
abs(X, Result) :- (X >= 0 -> Result = X ; Result is -X).
```

## Lower-Priority Additions

### 14. Definite Clause Grammars (DCGs)

**Current:** No parsing support
**Needed:** DCG syntax with --> operator

**Why Useful:** Natural language processing, parsing

**Implementation:**
- Add --> operator
- Transform DCG rules to ordinary rules
- Add phrase/2 predicate

### 15. Module System

**Current:** Global namespace
**Needed:** Modules for organization

**Implementation:**
- Module declaration syntax
- Import/export directives
- Qualified names (module:predicate)

### 16. Constraint Logic Programming (CLP)

**Current:** No constraints
**Needed:** Constraint domains (CLP(FD), CLP(R))

**Why Useful:** Solving combinatorial problems, optimization

### 17. Operators and Precedence

**Current:** Fixed operator set
**Needed:** Custom operators with precedence

**Implementation:**
- op/3 directive for defining operators
- Operator precedence parsing

## Features to PRESERVE (Frisco's Unique Contributions)

### 1. Semantic Matching (KEEP AND ENHANCE)

**Current Implementation:**
- =~= operator with embedding vectors
- 0.7 threshold cosine similarity
- BGE-Small-EN-V1.5 model

**Recommendations:**
- Keep as Frisco's distinguishing feature
- Add alongside exact equality (==), not replacing it
- Make threshold configurable per query
- Add `similar(X, Y, Threshold)` predicate for explicit control
- Consider adding semantic distance predicate: `semantic_distance(X, Y, Distance)`

**Example:**
```frisco
# Exact match
? Man.genus == "Mammal".
True

# Semantic match (fuzzy)
? Man.genus =~= "creature".
True

# Explicit threshold
? similar(Man.genus, "animal", 0.8).
False  # Only 0.75 similar
```

### 2. Concept/Entity Ontology (KEEP AND INTEGRATE)

**Current:** First-class concepts and entities

**Recommendations:**
- Keep as core language feature
- Integrate with standard Prolog predicates
- Allow concepts/entities to coexist with facts/rules
- Add predicates for querying ontology:
  - `concept(Name)` - check if concept exists
  - `entity(Name)` - check if entity exists
  - `instance_of(Entity, Concept)` - check type
  - `subconcept_of(Concept1, Concept2)` - check hierarchy

### 3. Objectivist Epistemology Structure (KEEP)

**Current:** genus, attributes, essentials, description

**Recommendations:**
- Keep as philosophical foundation
- These can coexist with general Prolog features
- Make them special predicates that work with standard logic

### 4. Field Access Syntax (KEEP)

**Current:** Dot notation for properties (Entity.concept, Concept.genus)

**Recommendations:**
- Keep for convenience
- Also allow predicate-based access for consistency with Prolog:
  - `has_genus(Concept, Genus)`
  - `has_concept(Entity, Concept)`
  - `has_description(X, Description)`

## Implementation Priority Roadmap

### Phase 1: Core Logic Programming (Most Critical)
1. **Proper unification** - Foundation for everything else
2. **Lists with [H|T] syntax** - Essential data structure
3. **Numbers and arithmetic** - Basic computation
4. **Backtracking with multiple solutions** - Core Prolog behavior

**Impact:** Transforms Frisco from query system to logic programming language

### Phase 2: Essential Control Flow
5. **Negation** - Expressing negative conditions
6. **Cut operator** - Backtracking control
7. **Anonymous variables** - Code clarity
8. **Compound terms** - Complex data structures

**Impact:** Enables most standard Prolog programs

### Phase 3: Meta-Programming and Collections
9. **findall/bagof/setof** - Solution collection
10. **Type checking predicates** - Runtime introspection
11. **String manipulation** - Practical string operations
12. **assert/retract** - Dynamic knowledge base

**Impact:** Full Prolog compatibility for most use cases

### Phase 4: Advanced Features
13. **Disjunction** - OR operator
14. **If-then-else** - Conditional logic
15. **DCGs** - Parsing support
16. **Module system** - Large program organization

**Impact:** Complete Prolog implementation with Frisco's unique features

## Critical Files for Implementation

### Core Logic Engine
- `src/executor.ts` - Add unification, backtracking, multiple solutions
- `src/ast.ts` - Add List, CompoundTerm, Negation, Cut AST nodes
- `src/parser.ts` - Parse new syntax (lists, operators, compound terms)
- `src/lexer.ts` - Add new tokens (numbers, operators, brackets)

### Semantic Features (Preserve)
- `src/semantic-matcher.ts` - Keep as-is, integrate with unification

### Built-ins
- Create `src/builtins.ts` - Centralize all built-in predicates
- Move print/println/readln here
- Add arithmetic, list, string, type-checking predicates

### Testing
- `src/__tests__/unification.test.ts` - New tests for unification
- `src/__tests__/lists.test.ts` - New tests for lists
- `src/__tests__/arithmetic.test.ts` - New tests for arithmetic
- Update existing tests to handle multiple solutions

## Design Decisions

### 1. Exact Equality vs Semantic Matching

**Decision:** Support BOTH operators
- `==` or `=` for exact equality (standard Prolog)
- `=~=` for semantic matching (Frisco's innovation)

**Rationale:** Users need exact matching for deterministic logic and semantic matching for fuzzy reasoning.

### 2. Unification Implementation

**Decision:** Implement full unification with occurs check
- Use standard unification algorithm (Robinson's algorithm)
- Support compound terms and lists
- Add occurs check to prevent infinite terms

**Rationale:** Proper unification is non-negotiable for Prolog compatibility.

### 3. Backtracking Strategy

**Decision:** Implement full depth-first search with backtracking
- Maintain choice points for alternative rules
- Support interactive solution iteration (semicolon to continue)
- Add findall/bagof/setof for solution collection

**Rationale:** Multiple solutions are core to Prolog's declarative nature.

### 4. Type System

**Decision:** Keep dynamic typing, add runtime type checking
- No static type checking (like Prolog)
- Add type-checking predicates (var, nonvar, atom, number, etc.)
- Integrate concept/entity types with standard types

**Rationale:** Prolog is dynamically typed; static typing would be a major departure.

### 5. Syntax Compatibility

**Decision:** Keep Frisco syntax, extend with Prolog features
- Periods remain optional (Frisco style)
- Support both concept/entity declarations AND standard facts
- Keep =~= alongside == for semantic/exact matching
- Keep field access syntax (Entity.field)

**Rationale:** Preserve Frisco's ergonomics while adding Prolog power.

## Summary

Frisco has an excellent foundation with its semantic matching and concept ontology, but needs significant enhancement to become a true logic programming language. The roadmap above would transform it from a semantic query system into a full Prolog implementation with unique philosophical and semantic reasoning capabilities.

**Key recommendation:** Implement Phase 1 (unification, lists, numbers, backtracking) first. This provides 80% of Prolog's utility while preserving Frisco's unique semantic matching feature as a competitive advantage.
