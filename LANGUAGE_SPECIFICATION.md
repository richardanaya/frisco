# Frisco Language Specification

Version 0.1.0

## Overview

Frisco is a logic programming language combining Prolog-style inference with Objectivist epistemology and semantic matching via an LLM-as-judge approach that implements measurement omission.

## Lexical Elements

### Keywords
- `Concept` - Declares an abstract concept
- `Entity` - Declares a concrete instance
- `description`, `attributes`, `essentials` - concept properties

### Operators
- `=` - Assignment
- `=~=` - Semantic match (LLM-judged similarity ≥ 0.7)
- `:-` - Logical implication (rule definition)
- `?` - Query operator
- `.` - Field access / statement terminator
- `,` - Conjunction (AND)

### Identifiers
- **Constants**: `UPPERCASE` or `PascalCase` (entities, concept names)
- **Variables**: `lowercase_with_underscores` (predicates, variables)

### Literals
- **Strings**: `"double quoted text"`
- **Arrays**: `[item1, item2, item3]`

### Comments
- `#` Single-line comments

## Syntax

### concept Declaration

```frisco
concept <Name>: description = "<text>", attributes = [<string-list>], essentials = [<identifier-list>].
```

**Example:**
```frisco
concept Dog: description = "domesticated canine", attributes = ["four legs", "furry", "loyal"], essentials = ["mammal", "carnivore"].
```

### entity Declaration

```frisco
entity <NAME>: <ConceptType>.
  description = "<text>"
```

**Example:**
```frisco
entity FIDO: Dog, description = "golden retriever".
```

### Concept Inheritance

```frisco
concept <Derived>: <Base>, <additional properties>.
```

**Example:**
```frisco
concept Philosopher: Person, description = "lover of wisdom".
```

### Rule Declaration

```frisco
<predicate>(<params>) :- <condition1>, <condition2>, ...
```

**Example:**
```frisco
pet(x) :- x.description =~= "friendly animal".
```

### Query

```frisco
? <predicate>(<arguments>).
```

**Example:**
```frisco
? pet(FIDO).
```

## Built-in Predicates

Frisco provides built-in predicates for I/O and other side effects.

### I/O Predicates

#### `print(...)`
Print one or more values without a newline. Automatically resolves variables.

```frisco
? print("Hello").           # Prints: Hello
? print("The answer is:", 42).  # Prints: The answer is: 42

# In rules:
greet(name) :- print("Hello, ", name).
? greet(WORLD).             # Prints: Hello, WORLD
```

#### `println(...)`
Print one or more values with a newline.

```frisco
? println("Hello, World!").     # Prints: Hello, World! (with newline)
? println("Name:", person).     # Prints: Name: <value> (with newline)

# Multiple arguments separated by spaces:
? println("The", "quick", "fox").  # Prints: The quick fox
```

### Using I/O in Rules

Built-in predicates can be used in rule bodies for debugging or interactive reasoning:

```frisco
mortal(person) :-
  println("Checking:", person),
  person.description =~= "human being",
  println("Confirmed:", person, "is mortal").

? mortal(SOCRATES).
# Output:
# Checking: SOCRATES
# Confirmed: SOCRATES is mortal
# True
```

## Semantic Matching

Frisco provides semantic comparison operations grounded in Objectivist epistemology, using an LLM-as-judge at `localhost:9090`.

### Conceptual Identity (`=~=`)

The `=~=` operator asks: **"Do these descriptions refer to the same concept?"**

```frisco
"dog" =~= "canine"              # True - same concept
"philosopher" =~= "lover of wisdom"  # True - same concept
"dog" =~= "mathematics"          # False - different concepts
["cat", "dog"] =~= "puppy"      # True (dog ≈ puppy)
```

This is a **linguistic/semantic** operation — recognizing synonyms and paraphrases. Returns true if similarity ≥ 0.7.

### Attribute Possession (`has_attr/2`)

The `has_attr(Characteristic, Concrete)` predicate asks: **"Does this concrete possess this characteristic at all?"**

```frisco
has_attr(size, "elephant")        # True - elephants have size
has_attr(size, "mouse")           # True - mice have size too!
has_attr(color, "justice")        # False - abstractions lack color
has_attr(lifespan, "rock")        # False - rocks don't have lifespans
has_attr(temperature, "water")    # True - water has temperature
```

This is the **retention** half of measurement-omission: we check whether the attribute *exists*, not its specific value. Binary result (succeeds or fails).

### Shared Characteristics (`share_attr/3`)

The `share_attr(Characteristic, A, B)` predicate asks: **"Do both concretes possess this characteristic?"**

```frisco
share_attr(size, "elephant", "mouse")      # True! Both have size
share_attr(color, "apple", "fire truck")   # True - both have color
share_attr(metabolism, "dog", "rock")      # False - rock lacks it
share_attr(lifespan, "human", "mayfly")    # True - both have lifespans
```

This is true **measurement-omission**: the question is whether they *share the attribute type*, not whether their measurements are similar. An elephant and mouse are vastly different in size, but *both have size* — so they can be grouped by this characteristic. Binary result.

### Differentia (`differentia/3`)

The `differentia(A, B, Result)` predicate asks: **"What distinguishes A from B?"**

```frisco
differentia("human", "other animals", X)   # X = "rationality"
differentia("square", "rectangles", X)     # X = "equal sides"
differentia("triangle", "polygons", X)     # X = "three sides"
```

This implements the Objectivist definition structure: **genus + differentia**. Given a concept and its genus (or comparison class), the LLM identifies the distinguishing characteristic. Binds the result to the third argument.

### Gradient Similarity (`similar_attr/3`)

The `similar_attr(Axis, A, B)` predicate asks: **"How similar are their measurements along this axis?"**

```frisco
similar_attr(color, "crimson", "scarlet")  # Succeeds - similar shades
similar_attr(size, "elephant", "mouse")    # Fails - very different sizes
```

This compares measurements rather than checking for attribute presence. Less epistemologically pure but useful for practical reasoning. Returns true if similarity ≥ 0.7.

### Summary of Operations

| Predicate | Question | Result | Epistemological Role |
|-----------|----------|--------|---------------------|
| `A =~= B` | Same concept? | Boolean | Linguistic co-reference |
| `has_attr(C, X)` | X has characteristic C? | Boolean | Attribute retention |
| `share_attr(C, X, Y)` | Both X and Y have C? | Boolean | **Measurement-omission** |
| `differentia(A, B, R)` | What distinguishes A from B? | Binds R | Definition formation |
| `similar_attr(C, X, Y)` | Similar measurements on C? | Boolean | Gradient comparison |

### The Key Insight

The difference between `share_attr/3` and `similar_attr/3` is crucial:

- `share_attr(size, "elephant", "mouse")` → **True** (both possess size)
- `similar_attr(size, "elephant", "mouse")` → **False** (very different measurements)

For concept formation, what matters is whether entities *share an attribute* — not how similar their measurements are. This is Rand's measurement-omission principle.

## Field Access

Access concept/entity properties using dot notation:

```frisco
Man.description          # Access description field
Man.attributes           # Access attributes array
SOCRATES.description     # Access entity description
target.essentials        # Access via variable (must be bound)
```

## Evaluation Model

1. **Knowledge Base**: Stores concepts, entities, and rules
2. **Unification**: Binds variables to values
3. **Backtracking**: Tries alternative rules if current path fails
4. **Semantic Matching**: Uses embeddings for fuzzy comparison

## Examples

### Example 1: Simple Classification

```frisco
concept Bird.
  attributes = ["wings", "feathers", "flies"]

entity SPARROW: Bird.
  description = "small bird"

can_fly(x) :- Bird.attributes =~= "able to fly".

? can_fly(SPARROW).
# Output: True
```

### Example 2: Multiple Conditions

```frisco
concept Mammal.
  attributes = ["warm-blooded", "hair"]

concept Carnivore.
  essentials = ["eats_meat"]

entity LION: Mammal.
  description = "large cat"

predator(x) :-
  x.description =~= "large feline",
  Carnivore.essentials =~= "meat eater".

? predator(LION).
# Output: True
```

### Example 3: Philosophical Reasoning

```frisco
concept Man: description = "rational animal", essentials = ["reason", "free_will"].

concept Mortal: attributes = ["finite lifespan"].

entity ARISTOTLE: Man, description = "Greek philosopher".

mortal(x) :-
  Man.essentials =~= "rational faculty",
  x.description =~= "philosopher".

? mortal(ARISTOTLE).
# Output: True
```

### Example 4: Transitive Properties

```frisco
concept Vehicle.
  attributes = ["transport", "wheels"]

concept Car.
  essentials = ["motor", "four_wheels"]

entity TOYOTA: Car.
  description = "sedan"

needs_fuel(x) :-
  x.description =~= "automobile",
  Car.essentials =~= "engine".

? needs_fuel(TOYOTA).
# Output: True
```

### Example 5: Negative Case

```frisco
concept Plant.
  attributes = ["photosynthesis", "roots"]

entity ROSE: Plant.
  description = "flowering plant"

can_run(x) :- x.description =~= "animal with legs".

? can_run(ROSE).
# Output: False
```

### Example 6: Array Matching

```frisco
concept Language.
  attributes = [
    "human communication",
    "symbolic system",
    "grammar rules"
  ]

structured(x) :-
  Language.attributes =~= "organized system with rules".

? structured(Language).
# Output: True (matches "grammar rules")
```

### Example 7: Variable Binding

```frisco
concept Shape.
  essentials = ["geometry"]

entity CIRCLE: Shape.
  description = "round shape"

entity SQUARE: Shape.
  description = "four-sided shape"

has_sides(x) :- x.description =~= "polygon".

? has_sides(CIRCLE).  # False
? has_sides(SQUARE).  # True
```

---

# Appendix: Tour of Frisco

A hands-on introduction to Frisco programming, inspired by Tour of Go.

## 1. Hello, World

Let's start with the simplest Frisco program:

```frisco
concept Greeting.
  description = "hello message"

entity HELLO: Greeting.
  description = "Hello, World"

is_greeting(x) :- x.description =~= "salutation".

? is_greeting(HELLO).
```

**What happens:**
- We define a `Greeting` concept
- Create a `HELLO` entity
- Define a rule that checks if something is a greeting
- Query whether `HELLO` is a greeting
- Output: `True`

## 2. Concepts

Concepts are abstract ideas with three properties:

```frisco
concept Animal.
  description = "living organism"
  attributes = ["breathes", "moves", "eats"]
  essentials = ["biological", "alive"]
```

- **description**: What the concept means
- **attributes**: Observable characteristics
- **essentials**: Fundamental properties that define it

## 3. Entities

Entities are concrete instances of concepts:

```frisco
concept Cat.
  attributes = ["whiskers", "purrs", "claws"]

entity FLUFFY: Cat.
  description = "tabby cat"
```

Entities inherit concept properties and can add their own description.

## 4. Semantic Matching

Frisco provides epistemologically-grounded semantic operations:

### Conceptual Identity (`=~=`)

The `=~=` operator asks "Do these refer to the same concept?"

```frisco
"dog" =~= "canine"           # True - same concept
"happy" =~= "joyful"         # True - same concept
"tree" =~= "software"        # False - different concepts
```

### Attribute Possession (`has_attr/2`)

Check if a concrete possesses a characteristic:

```frisco
has_attr(size, "elephant")     # True - elephants have size
has_attr(color, "justice")     # False - abstractions lack color
```

### Shared Characteristics (`share_attr/3`)

The true measurement-omission operation — do both possess this attribute?

```frisco
share_attr(size, "elephant", "mouse")    # True! Both have size
share_attr(metabolism, "dog", "rock")    # False - rock lacks it
```

The key insight: elephants and mice have *vastly different* sizes, but they *both have size*. That's what matters for concept formation.

### Differentia (`differentia/3`)

Find what distinguishes one thing from another (genus + differentia):

```frisco
differentia("human", "animals", X)   # X = "rationality"
differentia("square", "rectangles", X)  # X = "equal sides"
```

### Gradient Similarity (`similar_attr/3`)

Compare measurements along an axis (less pure, but useful):

```frisco
similar_attr(color, "crimson", "scarlet")  # True - similar shades
similar_attr(size, "elephant", "mouse")    # False - very different
```

## 5. Field Access

Use `.` to access properties:

```frisco
concept Person.
  description = "human being"
  essentials = ["consciousness"]

entity ALICE: Person.
  description = "software engineer"

# Access concept fields
Person.description        # "human being"
Person.essentials         # ["consciousness"]

# Access entity fields
ALICE.description         # "software engineer"
```

## 6. Rules

Rules define logical relationships:

```frisco
# Format: head :- body.
predicate(parameter) :- condition.
```

Example:

```frisco
concept Tree.
  attributes = ["trunk", "leaves", "roots"]

alive(x) :- Tree.attributes =~= "living organism parts".
```

## 7. Multiple Conditions

Combine conditions with `,` (AND):

```frisco
concept Mammal.
  attributes = ["warm-blooded", "milk"]

concept Pet.
  attributes = ["domesticated", "friendly"]

good_pet(x) :-
  x.description =~= "animal companion",
  Mammal.attributes =~= "produces milk",
  Pet.attributes =~= "tame".
```

All conditions must be true for the rule to succeed.

## 8. Variables

Variables bind to values during query evaluation:

```frisco
entity DOG: Animal.
  description = "loyal companion"

entity ROCK: Mineral.
  description = "hard stone"

living(thing) :- thing.description =~= "alive".

? living(DOG).   # True, thing=DOG
? living(ROCK).  # False
```

The variable `thing` gets bound to `DOG` or `ROCK`.

## 9. Queries

Queries ask questions:

```frisco
? predicate(argument).
```

Output is either `True` or `False`, with variable bindings:

```frisco
mortal(x) :- Man.attributes =~= "finite".

? mortal(SOCRATES).
# Output:
# True
# Bindings:
#   x = SOCRATES
```

## 10. Building Knowledge

Let's build a knowledge base about shapes:

```frisco
concept Shape.
  description = "geometric form"

concept Circle.
  attributes = ["round", "no corners", "curved"]
  essentials = ["continuous_curve"]

concept Square.
  attributes = ["four sides", "four corners", "equal sides"]
  essentials = ["quadrilateral", "right_angles"]

entity WHEEL: Circle.
  description = "circular object"

entity BOX: Square.
  description = "cubic container"

has_corners(x) :- x.description =~= "angular shape".

? has_corners(WHEEL).  # False
? has_corners(BOX).    # True
```

## 11. Reasoning Example

Classic syllogism in Frisco:

```frisco
concept Man.
  attributes = [
    "mortal being",
    "finite lifespan",
    "rational faculty"
  ]

entity SOCRATES: Man.
  description = "Socrates"

mortal(person) :-
  person.description =~= "human",
  Man.attributes =~= "will die".

? mortal(SOCRATES).
# True - Socrates is mortal
```

## 12. Input/Output

Frisco has built-in predicates for printing to the terminal:

### Printing

```frisco
# Print without newline
? print("Hello").
# Output: HelloTrue

# Print with newline
? println("Hello, World!").
# Output: Hello, World!
#         True

# Print multiple values
? println("The answer is:", 42).
# Output: The answer is: 42
#         True

# Blank line
? println("").
# Output: 
#         True
```

### I/O in Rules

Use I/O to trace reasoning:

```frisco
concept Man.
  attributes = ["mortal", "rational"]

entity ARISTOTLE: Man.
  description = "philosopher"

check_mortal(person) :-
  println("Analyzing:", person),
  print("  Is philosopher? "),
  person.description =~= "thinker",
  println("Yes!"),
  print("  Has mortality? "),
  Man.attributes =~= "will die",
  println("Yes!"),
  println("Conclusion:", person, "is mortal").

? check_mortal(ARISTOTLE).
# Output:
# Analyzing: ARISTOTLE
#   Is philosopher? Yes!
#   Has mortality? Yes!
# Conclusion: ARISTOTLE is mortal
# True
```

This is incredibly useful for:
- **Debugging**: See which rules fire
- **Interactive reasoning**: Show logical steps
- **User feedback**: Explain conclusions

## 13. Philosophical Concepts

Frisco shines with abstract reasoning:

```frisco
concept Justice.
  description = "moral rightness"
  essentials = ["fairness", "rights", "law"]

concept Action.
  attributes = ["voluntary", "deliberate"]

just_action(x) :-
  Action.attributes =~= "intentional deed",
  Justice.essentials =~= "respects individual rights",
  x.description =~= "moral choice".

entity HONESTY: Action.
  description = "truthful behavior"

? just_action(HONESTY).
# True
```

## 14. Scientific Classification

Taxonomies work naturally:

```frisco
concept Kingdom.
  description = "highest biological rank"

concept Phylum.
  essentials = ["body_plan"]

concept Mammal.
  attributes = ["hair", "mammary glands", "warm-blooded"]
  essentials = ["vertebrate", "live_birth"]

concept Primate.
  attributes = ["opposable thumbs", "large brain"]

entity HUMAN: Primate.
  description = "homo sapiens"

intelligent(x) :-
  Primate.attributes =~= "advanced cognition",
  x.description =~= "reasoning being".

? intelligent(HUMAN).
# True
```

## 15. Multiple Queries

Run several queries in one program:

```frisco
concept Bird.
  attributes = ["wings", "feathers", "beak"]

entity PENGUIN: Bird.
  description = "flightless bird"

entity EAGLE: Bird.
  description = "soaring raptor"

can_fly(x) :- x.description =~= "flying animal".

? can_fly(EAGLE).    # True
? can_fly(PENGUIN).  # False
```

## 16. Complex Reasoning

Combine everything:

```frisco
concept Virtue.
  description = "moral excellence"
  essentials = ["good_character"]

concept Rationality.
  attributes = ["logical thinking", "reason"]

concept Courage.
  essentials = ["facing_fear", "acting_rightly"]

virtuous_action(act) :-
  act.description =~= "brave deed",
  Courage.essentials =~= "overcoming danger",
  Rationality.attributes =~= "reasoned choice",
  Virtue.essentials =~= "excellence of character".

entity RESCUE: Courage.
  description = "saving someone from danger"

? virtuous_action(RESCUE).
# True
```

## 17. Practical Tips

**Tip 1**: Descriptions should be concise but meaningful

```frisco
# Good
entity CAR: Vehicle.
  description = "automobile"

# Better for matching
entity CAR: Vehicle.
  description = "motorized road vehicle"
```

**Tip 2**: Use arrays for multiple related attributes

```frisco
concept Fish.
  attributes = [
    "aquatic",
    "gills",
    "fins",
    "scales"
  ]
```

**Tip 3**: Essentials define what something IS

```frisco
concept Triangle.
  essentials = ["three_sides", "three_angles"]
  # These MUST be true for something to be a triangle
```

**Tip 4**: Test semantic matches interactively

```frisco
# Try different phrasings to see what matches
test_match(x) :- x.description =~= "your test phrase".
```

## 18. Common Patterns

**Pattern 1: Type Checking**

```frisco
is_type(entity, type) :-
  type.essentials =~= "defining characteristic",
  entity.description =~= "instance description".
```

**Pattern 2: Property Testing**

```frisco
has_property(x, prop) :-
  x.description =~= prop.
```

**Pattern 3: Classification**

```frisco
classify(x, category) :-
  category.attributes =~= "characteristic",
  x.description =~= "matching description".
```

## 19. Next Steps

Now you know Frisco! To continue:

1. **Experiment**: Modify the examples
2. **Build**: Create your own concepts and entities
3. **Reason**: Write complex rules
4. **Explore**: Try philosophical or scientific domains

Example project: Build a taxonomy of programming languages!

```frisco
concept Language.
  essentials = ["syntax", "semantics"]

concept Functional.
  attributes = [
    "first-class functions",
    "immutability",
    "recursion"
  ]

entity LISP: Functional.
  description = "parenthesized prefix notation"

expressive(x) :-
  Functional.attributes =~= "powerful abstraction",
  x.description =~= "homoiconic language".

? expressive(LISP).
```

**Happy reasoning! 🎉**
