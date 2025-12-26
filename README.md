<div align="center">

![Frisco](Frisco.jpeg)

# Frisco Programming Language

**A logic programming language for calculating debates through conceptual reasoning**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](src/__tests__)

[Language Specification](LANGUAGE_SPECIFICATION.md) • [Examples](examples/) • [Tour of Frisco](LANGUAGE_SPECIFICATION.md#appendix-tour-of-frisco)

</div>

---

## 🎯 What is Frisco?

Frisco is a **logic programming language** that enables precise reasoning about concepts and relationships using semantic similarity. It combines Prolog-style inference with Objectivist epistemology and modern embedding vectors to create a system where philosophical arguments, scientific classifications, and logical proofs can be computed mechanically.

```frisco
Concept Man.
  description = "rational animal"
  attributes = ["finite lifespan", "biological organism"]
  essentials = ["rational_faculty", "volitional_consciousness"]

Entity SOCRATES: Man.
  description = "Socrates"

mortal(x) :-
  x.description ~== "philosopher from Athens",
  Man.attributes ~== "will eventually die".

?- mortal(SOCRATES).
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
Concept Triangle.
  description = "three-sided polygon"
  essentials = ["three_sides", "three_angles"]  # What makes it a triangle
  attributes = ["closed_shape", "plane_figure"]  # Observable properties
```

### Embedding Vectors: Computing Conceptual Similarity

Human concepts are not rigid symbol-matching systems — we recognize that "canine" and "dog" refer to the same entity despite different words. Frisco bridges symbolic logic and perceptual cognition using **embedding vectors**:

- **Semantic matching (`~==`)**: Compares meaning, not just strings
- **Cosine similarity**: Measures conceptual closeness in vector space
- **Threshold-based matching**: Similarity ≥ 0.7 is considered a match

This allows flexible reasoning:
```frisco
Man.attributes ~== "will eventually die"
# Matches "finite lifespan" or "mortal being" without exact text
```

The `~==` operator embodies the Objectivist insight that concepts integrate similar perceptual concretes — embeddings capture this integration mathematically.

---

## ✨ Key Features

### 🧠 **Concept-Based Ontology**
Define abstract ideas with descriptions, attributes, and essentials — mirroring human conceptual hierarchies.

### 🔍 **Semantic Matching**
The revolutionary `~==` operator uses embedding vectors (via [FastEmbed](https://github.com/xenova/fastembed)) to match meaning, not syntax.

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

### Run Your First Program

Create `hello.frisco`:
```frisco
Concept Greeting.
  description = "friendly salutation"

Entity HELLO: Greeting.
  description = "Hello, World!"

friendly(x) :- x.description ~== "warm welcome".

?- friendly(HELLO).
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
Concept Animal.
  description = "living organism"          # What it means
  attributes = ["breathes", "moves"]       # Observable traits
  essentials = ["biological", "alive"]     # Defining characteristics
```

### Entities

Concrete instances of concepts:

```frisco
Entity FIDO: Dog.
  description = "golden retriever"
```

### Rules

Define logical relationships:

```frisco
pet(x) :-
  x.description ~== "domesticated animal",
  Dog.attributes ~== "friendly".
```

### Queries

Ask questions:

```frisco
?- pet(FIDO).
```

### Semantic Matching

The `~==` operator compares conceptual similarity:

| Expression | Result | Reason |
|------------|--------|--------|
| `"dog" ~== "canine"` | ✅ True | Semantically similar |
| `"happy" ~== "joyful"` | ✅ True | Synonymous |
| `"cat" ~== "mathematics"` | ❌ False | Unrelated |
| `["red", "blue"] ~== "crimson"` | ✅ True | Matches "red" |

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
         └─► Semantic Matcher (FastEmbed)
                 │
                 └─► Embedding Vectors → Cosine Similarity
```

**Core Components:**
- **Lexer** ([src/lexer.ts](src/lexer.ts)) - Tokenization
- **Parser** ([src/parser.ts](src/parser.ts)) - AST construction
- **Executor** ([src/executor.ts](src/executor.ts)) - Logic engine with unification and backtracking
- **Semantic Matcher** ([src/semantic-matcher.ts](src/semantic-matcher.ts)) - Embedding-based similarity

---

## 🧪 Testing

Run the test suite:

```bash
npm test
```

16 unit tests covering lexer, parser, and executor.

---

## 🎯 Use Cases

### Philosophy
```frisco
Concept Virtue.
  essentials = ["moral_excellence", "good_character"]

virtuous(x) :- x.description ~== "morally praiseworthy act".
```

### Science
```frisco
Concept Mammal.
  attributes = ["warm-blooded", "hair", "milk"]

Entity WHALE: Mammal.
  description = "aquatic mammal"
```

### Logic
```frisco
# All men are mortal
# Socrates is a man
# Therefore, Socrates is mortal
```

### Knowledge Representation
Build taxonomies, ontologies, and semantic networks with precise conceptual relationships.

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- Additional embedding models
- Performance optimizations
- Standard library of philosophical concepts
- IDE integration
- REPL mode

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **Gottfried Wilhelm Leibniz** - Vision of mechanical reasoning
- **Ayn Rand** - Theory of concepts and Objectivist epistemology
- **Alain Colmerauer & Robert Kowalski** - Prolog and logic programming
- **Modern NLP Research** - Embedding vectors and semantic similarity

---

<div align="center">

**"Let us calculate!"** — *Leibniz*

*Frisco: Where philosophy meets computation*

</div>
