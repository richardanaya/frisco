<div align="center">

![Frisco](frisco.png)

# Frisco Programming Language

**A logic programming language for calculating debates through conceptual reasoning**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](src/__tests__)

[Language Specification](LANGUAGE_SPECIFICATION.md) • [Examples](examples/) • [**Tour of Frisco**](https://richardanaya.github.io/frisco/tour/index.html)

</div>

---

## 🎯 What is Frisco?

Frisco is a **logic programming language** focused on argument and ontology analysis: precise reasoning about concepts, relations, and semantic similarity. It combines Prolog-style inference with Objectivist epistemology and LLM-based semantic matching to compute philosophical arguments, scientific classifications, and logical proofs.

### Project goal

- Match the essential functionality of the first Prolog release (unification, backtracking over Horn clauses, lists/compound terms, cut, disjunction, negation) while omitting arithmetic.
- Provide tools for argument/ontology analysis aligned with Ayn Rand’s epistemology: concepts defined by genus/differentia and essentials, semantic similarity as a proxy for measurement omission, and structured reasoning over attributes/entities.

### How this supports argument/ontology analysis

- **Concept/ontology scaffolding:** Concepts, entities, attributes, essentials, and field access let you model genus/differentia and per-entity descriptors.
- **Unification & backtracking:** Core Prolog-style search over Horn clauses enables inference chains for arguments.
- **Semantic similarity (`=~=`):** LLM-as-judge fuzzy matching of strings/lists implements measurement omission—treating close descriptors as equivalent when exact magnitudes are omitted.
- **Dimensional similarity (`similar_attr/3`):** Per-attribute semantic comparison (e.g., color, material) scoped by a specific axis, using an LLM to judge similarity along that dimension.
- **Logical control:** Cut, disjunction, negation-as-failure, if-then-else allow disciplined search control for structured argument evaluation.
- **Collections:** `findall/3`, `setof/3` (dedup) to gather supporting facts/solutions for argument assembly.
- **Type guards:** `is_atom/1`, `is_list/1`, `is_bound/1`, `is_unbound/1` to keep reasoning paths well-formed.

```frisco
concept Man: description = "rational animal", attributes = ["finite lifespan", "biological organism"], essentials = ["rational_faculty", "volitional_consciousness"].

entity SOCRATES: Man, description = "Socrates".

mortal(x) :-
  x.description =~= "philosopher from Athens",
  Man.attributes =~= "will eventually die".

? mortal(SOCRATES).
# True
```

## 💡 Philosophical Inspiration

### Leibniz's Dream: *Calculemus!*

In the 17th century, Gottfried Wilhelm Leibniz envisioned a **characteristica universalis** — a formal language in which all human reasoning could be reduced to calculation. He famously proclaimed:

> *"If controversies were to arise, there would be no more need of disputation between two philosophers than between two accountants. For it would suffice to take their pencils in their hands, sit down to their slates, and say to each other: **Calculemus!** (Let us calculate!)"*

Frisco realizes this dream by providing a computable framework for philosophical reasoning. When two thinkers disagree about whether Socrates is mortal, they need not argue — they can write formal definitions and let the machine compute the answer.

### Ayn Rand's Theory of Concepts

Frisco's epistemological foundation comes from Ayn Rand's **theory of concepts** as articulated in *Introduction to Objectivist Epistemology*:

- **Concepts are formed by measurement-omission**: We identify essential characteristics while omitting specific measurements
- **Definitions specify essentials**: A proper definition identifies the fundamental characteristics that make something what it is
- **Concepts have referents**: They integrate perceptual data into abstract mental units

In Frisco:
- **Essentials** capture the defining characteristics (genus + differentia)
- **Attributes** represent observable, measurable characteristics
- **Descriptions** provide the conceptual integration

```frisco
concept Triangle: description = "three-sided polygon", essentials = ["three_sides", "three_angles"], attributes = ["closed_shape", "plane_figure"].
```

### LLM-as-Judge: Two Modes of Conceptual Comparison

Human concepts are not rigid symbol-matching systems — we recognize that "canine" and "dog" refer to the same entity despite different words. Frisco bridges symbolic logic and perceptual cognition using an **LLM-as-judge** approach with two distinct operations:

#### 1. Conceptual Identity (`=~=`)

The `=~=` operator asks: **"Do these descriptions pick out the same concept or referent?"**

```frisco
"dog" =~= "canine"                    # True - same concept
"philosopher" =~= "lover of wisdom"   # True - same concept
"mortal" =~= "finite lifespan"        # True - same concept
"dog" =~= "vehicle"                   # False - different concepts
```

This is about **what something IS** — identifying whether two descriptions refer to the same abstract concept or concrete entity. The LLM judges conceptual identity, recognizing synonyms, paraphrases, and equivalent formulations.

#### 2. Measurement Omission (`similar_attr/3`)

The `similar_attr(Axis, A, B)` predicate asks: **"Do these concretes share this specific attribute, regardless of their measurements?"**

```frisco
similar_attr(color, "crimson", "scarlet")      # True - both are shades of red
similar_attr(lifespan, "human", "mayfly")      # Low - very different durations
similar_attr(material, "wooden chair", "oak table")  # True - both are wood
```

This is true **measurement omission** as described in Objectivist epistemology: concepts group concretes that share an attribute while differing in its specific measurement. The LLM evaluates similarity along a *specific dimension*, ignoring all other properties.

#### The Objectivist Distinction

From Rand's theory of concepts:
- **Concept formation** involves recognizing that concretes share attributes while their measurements differ
- **Conceptual identity** is about whether descriptions refer to the same abstraction

Frisco separates these:
- `=~=` handles **conceptual identity** — "Is this the same concept?"
- `similar_attr/3` handles **measurement omission** — "Do these share this attribute?"

#### How the LLM Scoring Works

The LLM returns a similarity score from 0.0 to 1.0:
- **1.0**: Same or nearly identical (identical concept, or same measurement on axis)
- **0.7-0.9**: Clearly comparable, same general category/range
- **0.4-0.6**: Related but significantly different
- **0.1-0.3**: Weak or metaphorical connection
- **0.0**: Unrelated (different concepts, or attribute not shared)

A match succeeds when similarity ≥ 0.7 (configurable threshold).

---

## ✨ Key Features

### 🧠 **Concept-Based Ontology**
Define abstract ideas with descriptions, attributes, and essentials — mirroring human conceptual hierarchies.

### 🔍 **Semantic Matching**
The revolutionary `=~=` operator uses an LLM-as-judge to match meaning via measurement omission, not syntax.

### ⚡ **Logic Programming**
Prolog-style rules and queries with unification, backtracking, and variable binding.

### 📖 **Declarative Reasoning**
Express what is true, not how to compute it. The engine handles inference automatically.

### 🎓 **Philosophical Precision**
Purpose-built for epistemology, ethics, metaphysics — domains where concepts matter.

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/yourusername/frisco.git
cd frisco
npm install
npm run build
```

### Interactive REPL

Start the interactive reasoner:
```bash
npm run repl
# or just:
npm run dev
```

Try it out:
```frisco
frisco> ? println("Hello, World!").
  Hello, World!
  True

frisco> concept Man: description = "rational animal".
  (no output)

frisco> entity SOCRATES: Man, description = "philosopher".
  (no output)

frisco> ? println(SOCRATES).
  SOCRATES
  True

frisco> :help
  (shows help)

frisco> :quit
```

The REPL features:
- 🎨 **Syntax highlighting** - Color-coded Frisco syntax
- 📜 **History** - See all your past interactions
- 💾 **Persistent knowledge base** - Concepts and entities stay loaded
- 🔧 **Built-in commands** - `:help`, `:kb`, `:clear`, `:quit`

### Run Your First Program

Create `hello.frisco`:
```frisco
concept Greeting.
  description = "friendly salutation"

entity HELLO: Greeting.
  description = "Hello, World!"

friendly(x) :- x.description =~= "warm welcome".

? friendly(HELLO).
```

Run it:
```bash
npm run dev hello.frisco
# Output: True
```

---

## 📚 Language Overview

### Concepts

Abstract ideas with three properties:

```frisco
concept Animal.
  description = "living organism"          # What it means
  attributes = ["breathes", "moves"]       # Observable traits
  essentials = ["biological", "alive"]     # Defining characteristics
```

### Entities

Concrete instances of concepts:

```frisco
entity FIDO: Dog.
  description = "golden retriever"
```

### Rules

Define logical relationships:

```frisco
pet(x) :-
  x.description =~= "domesticated animal",
  Dog.attributes =~= "friendly".
```

### Queries

Ask questions:

```frisco
? pet(FIDO).
```

### Semantic Matching

The `=~=` operator compares conceptual similarity:

| Expression | Result | Reason |
|------------|--------|--------|
| `"dog" =~= "canine"` | ✅ True | Semantically similar |
| `"happy" =~= "joyful"` | ✅ True | Synonymous |
| `"cat" =~= "mathematics"` | ❌ False | Unrelated |
| `["dog", "cat"] =~= "canine"` | ✅ True | Matches "dog" |

---

## 📖 Learn More

- **[Language Specification](LANGUAGE_SPECIFICATION.md)** - Complete syntax reference with examples
- **[Tour of Frisco](LANGUAGE_SPECIFICATION.md#appendix-tour-of-frisco)** - 18-lesson interactive tutorial
- **[Examples](examples/)** - Sample programs including the classic Socrates syllogism

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Frisco Source  │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ Lexer  │  Tokenizes source code
    └────┬───┘
         │
         ▼
    ┌────────┐
    │ Parser │  Builds Abstract Syntax Tree (AST)
    └────┬───┘
         │
         ▼
  ┌──────────────┐
  │   Executor   │  Evaluates queries with logic engine
  └──────┬───────┘
         │
         ├─► Concept/Entity Knowledge Base
         │
         ├─► Rule Database
         │
         └─► Semantic Matcher (LLM-as-Judge)
                 │
                 └─► localhost:9090 → Structured Output Similarity Score
```

**Core Components:**
- **Lexer** ([src/lexer.ts](src/lexer.ts)) - Tokenization
- **Parser** ([src/parser.ts](src/parser.ts)) - AST construction
- **Executor** ([src/executor.ts](src/executor.ts)) - Logic engine with unification and backtracking
- **Semantic Matcher** ([src/semantic-matcher.ts](src/semantic-matcher.ts)) - LLM-as-judge similarity via measurement omission

---

## 🧪 Testing

Run the test suite:

```bash
npm test
```

16 unit tests covering lexer, parser, and executor.

---

## 🎯 Use Cases

### Philosophy: Virtue Ethics
Reason about ethical concepts using semantic matching and conceptual definitions:

```frisco
concept Virtue.
  description = "excellence of character"
  essentials = ["moral_excellence", "good_character"]
  attributes = ["praiseworthy", "cultivated through practice"]

entity COURAGE: Virtue.
  description = "facing danger with confidence"

entity HONESTY: Virtue.
  description = "truthfulness in word and deed"

# Determine if an action exemplifies virtue
virtuous(action) :-
  action.description =~= "morally praiseworthy behavior",
  Virtue.essentials =~= "excellence".

# Test with different actions
? virtuous(COURAGE).
# True
```

### Science: Biological Classification
Model taxonomies and reason about hierarchical relationships:

```frisco
concept Mammal.
  description = "warm-blooded vertebrate"
  attributes = ["warm-blooded", "hair or fur", "produces milk", "live birth"]
  essentials = ["mammary_glands", "vertebrate"]

concept Cetacean: Mammal.
  description = "aquatic mammal"
  attributes = ["lives in water", "streamlined body", "breathes air"]

entity WHALE: Cetacean.
  description = "large marine mammal"

entity DOLPHIN: Cetacean.
  description = "intelligent aquatic mammal"

# Classify organisms by shared attributes
aquatic_mammal(x) :-
  x.description =~= "lives in ocean",
  Mammal.attributes =~= "warm-blooded".

has_mammalian_trait(x) :-
  x.concept =~= "warm-blooded creature".

? aquatic_mammal(WHALE).
# True

? has_mammalian_trait(DOLPHIN).
# True
```

### Logic: Classical Syllogism
Implement formal logical reasoning with the classic Socrates example:

```frisco
concept Man.
  description = "rational animal"
  attributes = ["finite lifespan", "biological organism", "mortal"]
  essentials = ["rational_faculty", "volitional_consciousness"]

entity SOCRATES: Man.
  description = "philosopher from Athens"

# Major premise: All men are mortal
man_is_mortal :-
  Man.attributes =~= "limited existence".

# Minor premise: Socrates is a man
socrates_is_man :-
  SOCRATES.description =~= "ancient Greek thinker".

# Conclusion: Therefore, Socrates is mortal
mortal(x) :-
  x.description =~= "philosopher from Athens",
  Man.attributes =~= "will eventually die".

? mortal(SOCRATES).
# True
```

### Knowledge Representation
Build rich ontologies with multi-level hierarchies and semantic relationships:

```frisco
concept LivingThing.
  description = "entity with biological life"

concept Animal: LivingThing.
  description = "living organism that can move"

concept Mammal: Animal.
  description = "warm-blooded vertebrate"

concept Primate: Mammal.
  description = "mammal with advanced cognition"
  attributes = ["opposable thumbs", "binocular vision", "large brain"]

concept Human: Primate.
  description = "rational primate"
  essentials = ["rational_thought", "language", "tool_use"]

entity ARISTOTLE: Human.
  description = "ancient philosopher and scientist"

# Query the hierarchy
in_animal_kingdom(x) :- x.genus =~= "creature".
is_thinking_being(x) :- x.concept =~= "rational being".

? in_animal_kingdom(Human).
# True

? is_thinking_being(ARISTOTLE).
# True
```

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Alternative LLM backends for semantic matching
- Performance optimizations
- Standard library of philosophical concepts
- IDE integration
- Caching strategies for LLM judgments

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **Gottfried Wilhelm Leibniz** - Vision of mechanical reasoning
- **Ayn Rand** - Theory of concepts and Objectivist epistemology
- **Alain Colmerauer & Robert Kowalski** - Prolog and logic programming
- **Large Language Models** - Enabling semantic similarity judgment via measurement omission

---

## 🧩 What is a Horn Clause?

**Horn clauses** are a fundamental building block of logic programming, named after logician **Alfred Horn** who characterized them in 1951. They are logical formulas with at most one positive conclusion, making them perfect for automated reasoning.

### Structure

In Frisco (and Prolog), Horn clauses take this form:

```frisco
# Fact (zero conditions, one conclusion)
mortal(socrates).

# Rule (one or more conditions, one conclusion)
mortal(X) :- human(X).

# Multiple conditions (all must be true)
grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
```

### The General Form

```
HEAD :- BODY₁, BODY₂, ..., BODYₙ.
```

Where:
- **HEAD** = the conclusion (what we're trying to prove)
- **BODY** = conditions that must all be true (`,` = AND)
- `:-` means "if" (read: "HEAD is true if all BODY conditions are true")

### Why Horn Clauses Matter

1. **Efficient computation** - Enable systematic backward chaining inference
2. **Definite logic** - No ambiguity: statements are either provable or not
3. **Foundation of Prolog** - All Prolog programs are built from Horn clauses
4. **Backtracking search** - The engine can explore all possible proofs automatically

### Horn Clauses in Frisco

Frisco extends traditional Horn clauses with semantic matching:

```frisco
mortal(x) :-
  x.description =~= "philosopher from Athens",
  Man.attributes =~= "will eventually die".
```

Here, `mortal(x)` is the HEAD, and the two semantic similarity conditions form the BODY. The `=~=` operator brings fuzzy conceptual matching to classical Horn clause logic.

---

<div align="center">

**"Let us calculate!"** — *Leibniz*

*Frisco: Where philosophy meets computation*

</div>
