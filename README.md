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

### LLM-as-Judge: Epistemologically-Grounded Operations

Human concepts are not rigid symbol-matching systems — we recognize that "canine" and "dog" refer to the same entity despite different words. Frisco uses an **LLM-as-judge** to implement operations grounded in Objectivist epistemology:

#### 1. Conceptual Identity (`=~=`)

The `=~=` operator asks: **"Do these descriptions refer to the same concept?"**

```frisco
"dog" =~= "canine"                    # True - same concept
"philosopher" =~= "lover of wisdom"   # True - same concept
"dog" =~= "vehicle"                   # False - different concepts
```

This is a **linguistic/semantic** operation — recognizing synonyms, paraphrases, and equivalent formulations. Useful but not strictly epistemological.

#### 2. Attribute Possession (`has_attr/2`)

The `has_attr(Characteristic, Concrete)` predicate asks: **"Does this concrete possess this characteristic at all?"**

```frisco
has_attr(size, "elephant")        # True - elephants have size
has_attr(size, "mouse")           # True - mice have size too!
has_attr(color, "justice")        # False - abstractions lack color
has_attr(lifespan, "rock")        # False - rocks don't have lifespans
```

This is the **retention** half of measurement-omission: we care whether the attribute *exists*, not its specific value.

#### 3. Shared Characteristics (`share_attr/3`)

The `share_attr(Characteristic, A, B)` predicate asks: **"Do both concretes possess this characteristic?"**

```frisco
share_attr(size, "elephant", "mouse")      # True! Both have size
share_attr(color, "apple", "fire truck")   # True - both have color
share_attr(metabolism, "dog", "rock")      # False - rock lacks it
```

This is true **measurement-omission**: the question is whether they *share the attribute type*, not whether their measurements are similar. An elephant and a mouse are vastly different in size, but *both have size* — so they can be grouped by this characteristic.

#### 4. Differentia (`differentia/3`)

The `differentia(A, B, Result)` predicate asks: **"What distinguishes A from B?"**

```frisco
differentia("human", "other animals", X)   # X = "rationality"
differentia("square", "rectangles", X)     # X = "equal sides"
differentia("triangle", "polygons", X)     # X = "three sides"
```

This implements the Objectivist definition structure: **genus + differentia**. Given a concept and its genus, find what distinguishes it.

#### 5. Gradient Similarity (`similar_attr/3`)

The `similar_attr(Axis, A, B)` predicate asks: **"How similar are their measurements along this axis?"**

```frisco
similar_attr(color, "crimson", "scarlet")  # High - similar shades
similar_attr(size, "elephant", "mouse")    # Low - very different
```

This is less epistemologically pure (it compares measurements rather than checking for attribute presence) but still useful for practical reasoning.

#### The Objectivist Distinction

| Operation | Question | Epistemological Role |
|-----------|----------|---------------------|
| `=~=` | Same concept? | Linguistic co-reference |
| `has_attr/2` | Has this attribute? | Attribute retention |
| `share_attr/3` | Both have this attribute? | **Measurement-omission** |
| `differentia/3` | What distinguishes A from B? | Definition (genus + differentia) |
| `similar_attr/3` | How similar on this axis? | Gradient comparison |

The key insight: `share_attr/3` is **binary** (yes/no), not gradient. An elephant and mouse *both have size* — that's what matters for concept formation, not that their sizes differ enormously.

#### Example: The Elephant and Mouse Problem

Can an elephant and a mouse be grouped under the same concept? Intuition says no — they're completely different sizes! But Rand's measurement-omission says **yes**:

```frisco
# Compare MEASUREMENTS - are they close?
? similar_attr(size, "elephant", "mouse").
# FALSE - vastly different sizes

# Check if they SHARE the attribute
? share_attr(size, "elephant", "mouse").
# TRUE - both HAVE size!
```

The difference is profound:

| Comparison | `similar_attr` | `share_attr` | Why? |
|------------|---------------|--------------|------|
| elephant vs mouse (size) | FALSE | **TRUE** | Different measurements, but both *have* size |
| human vs mayfly (lifespan) | FALSE | **TRUE** | 80 years vs 24 hours, but both *are mortal* |
| dog vs rock (metabolism) | FALSE | **FALSE** | Rock doesn't have metabolism *at all* |

The boundary of concept formation isn't "are these similar?" — it's "do they share this attribute?"

```frisco
# These CAN be grouped (both possess the attribute):
share_attr(size, "elephant", "mouse")        # TRUE - concept: "physical object"
share_attr(lifespan, "human", "mayfly")      # TRUE - concept: "mortal being"
share_attr(color, "apple", "fire truck")     # TRUE - concept: "colored thing"

# These CANNOT be grouped (one lacks the attribute entirely):
share_attr(metabolism, "dog", "rock")        # FALSE - rock has NO metabolism
share_attr(color, "apple", "justice")        # FALSE - justice has NO color
share_attr(lifespan, "human", "number 7")    # FALSE - numbers don't die
```

This is exactly Rand's principle: concepts group concretes that **share characteristics** while **differing in measurements**. The measurements are omitted — what matters is whether the attribute is *present*.

#### Example: Building Definitions with Differentia

The `differentia/3` predicate finds what distinguishes a concept from its genus:

```frisco
? differentia("human", "other animals", X).
# X = "rationality"

? differentia("square", "rectangles", X).
# X = "equal sides"

? differentia("triangle", "polygons", X).
# X = "three sides"
```

This implements the Objectivist definition structure: **genus + differentia**. A human is an *animal* (genus) with *rationality* (differentia). A square is a *rectangle* with *equal sides*.

---

## 🤖 How is this Useful for AI?

Large language models can generate fluent arguments, but they can't *verify* their own reasoning. Frisco changes that: an AI can construct arguments as executable logical structures, then **compute whether they're valid**.

### The Problem: Unverifiable Reasoning

When an LLM argues "Socrates is mortal because he's human, and humans are mortal," it's pattern-matching on training data. It can't:
- Check if "human" is a valid concept (what are its essentials?)
- Verify that Socrates actually falls under "human"
- Confirm that "mortal" follows from the premises

The reasoning *looks* right, but there's no computation backing it.

### The Solution: Executable Arguments

With Frisco, an AI can express the *same* argument as computable logic:

```frisco
# Define concepts with explicit structure
concept Human:
  description = "rational animal",
  essentials = [rationality, animality].

concept Mortal:
  description = "subject to death",
  essentials = [finite_lifespan].

entity SOCRATES: Human,
  description = "ancient Greek philosopher".

# The argument as a verifiable rule
mortal(X) :-
  X.concept = Human,                           # X is human
  share_attr(finite_lifespan, "human", "living thing"),  # humans share mortality with living things
  has_attr(finite_lifespan, X.description).    # X has finite lifespan

# Execute the argument
? mortal(SOCRATES).
# TRUE - with explicit reasoning chain
```

Now the argument **runs**. If any step fails, we know exactly where.

### Validating Conceptual Groupings

An AI might claim: "A corporation is like a person, so it has rights."

Frisco can check if this conceptual grouping is valid:

```frisco
# Can we group corporations with persons by "consciousness"?
? share_attr(consciousness, "corporation", "human person").
# FALSE - corporations lack consciousness

# Can we group them by "legal standing"?
? share_attr(legal_standing, "corporation", "human person").
# TRUE - both have legal standing

# The AI's argument is valid ONLY for legal-standing-based reasoning
# Not for consciousness-based reasoning (like suffering, dignity, etc.)
```

The AI can now say: "Corporations and persons can be grouped for *legal* purposes, but NOT for *moral* purposes that depend on consciousness."

### Building and Checking Definitions

An AI constructing an argument needs valid definitions. Frisco can verify them:

```frisco
# AI claims: "A lie is a statement intended to deceive"
# Let's verify this definition structure:

? differentia("lie", "statements", X).
# X = "intent to deceive" ✓

# Now check: does this definition correctly exclude non-lies?
? has_attr(intent_to_deceive, "honest mistake").
# FALSE ✓ - honest mistakes aren't lies (no intent)

? has_attr(intent_to_deceive, "fiction writing").
# FALSE ✓ - fiction isn't lying (no deception intent, audience knows)

? has_attr(intent_to_deceive, "deliberate falsehood to mislead").
# TRUE ✓ - this IS a lie
```

The AI has now *computed* that its definition is valid — it correctly includes lies and excludes non-lies.

### Transparent Reasoning Chains

When an AI uses Frisco, its reasoning becomes auditable:

```frisco
# AI's argument: "This policy is unjust"
unjust_policy(P) :-
  println("Checking if policy violates rights..."),
  has_attr(rights_violation, P.description),
  println("  ✓ Policy violates rights"),

  println("Checking if violation is initiated by force..."),
  share_attr(initiated_force, P.description, "coercion"),
  println("  ✓ Policy uses initiated force"),

  println("Checking against justice definition..."),
  differentia("justice", "social concepts", Diff),
  println("  Justice requires:", Diff),
  not(has_attr(Diff, P.description)),
  println("  ✗ Policy lacks this quality"),

  println("Conclusion: Policy is unjust").

? unjust_policy(PROPOSED_TAX).
```

Every step is explicit. If the argument fails, we see exactly *which* premise failed and *why*.

### The AI Advantage

| Without Frisco | With Frisco |
|----------------|-------------|
| "Trust me, this follows" | Explicit logical chain |
| Black-box reasoning | Auditable steps |
| Can't verify own arguments | Computes validity |
| Conceptual errors hidden | Invalid groupings caught |
| Definitions assumed | Definitions verified |

An AI using Frisco doesn't just *assert* that its reasoning is valid — it **proves** it by running the argument as a computation.

### Example: AI Self-Checking an Argument

```frisco
# AI wants to argue: "Taxation is theft"
# First, let's see if this conceptual equation holds

# What is the differentia of theft?
? differentia("theft", "property transfers", TheftDiff).
# TheftDiff = "without consent" or "by force"

# Does taxation share this characteristic?
? share_attr(without_owner_consent, "taxation", "theft").
# TRUE - both involve non-consensual taking

? share_attr(taking_of_property, "taxation", "theft").
# TRUE - both involve property transfer

# But wait - are there relevant differences?
? share_attr(legal_authorization, "taxation", "theft").
# FALSE - theft lacks legal authorization, taxation has it

# AI conclusion: "Taxation shares SOME characteristics with theft
# (non-consensual taking) but differs in others (legal authorization).
# The argument 'taxation is theft' is valid IFF legal authorization
# is not considered morally relevant to the definition of theft."
```

The AI has now *computed* the structure of its own argument, identified where it's strong (shared characteristics), and where it's contestable (differing characteristics). This is **verifiable reasoning**.

---

## ✨ Key Features

### 🧠 **Concept-Based Ontology**
Define abstract ideas with descriptions, attributes, and essentials — mirroring human conceptual hierarchies.

### 🔍 **Semantic Matching**
Epistemologically-grounded operations: `=~=` for conceptual identity, `share_attr/3` for true measurement-omission, and `differentia/3` for building definitions.

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
