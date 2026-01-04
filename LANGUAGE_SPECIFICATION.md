# Frisco Language Specification

Version 0.1.0

## Overview

Frisco is a logic programming language combining Prolog-style inference with Objectivist epistemology and semantic matching via embedding vectors.

## Lexical Elements

### Keywords
- `Concept` - Declares an abstract concept
- `Entity` - Declares a concrete instance
- `description`, `attributes`, `essentials` - concept properties

### Operators
- `=` - Assignment
- `=~=` - Semantic match (embedding-based similarity ≥ 0.7)
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
concept <Name>.
  description = "<text>"
  attributes = [<string-list>]
  essentials = [<identifier-list>]
```

**Example:**
```frisco
concept Dog.
  description = "domesticated canine"
  attributes = ["four legs", "furry", "loyal"]
  essentials = ["mammal", "carnivore"]
```

### entity Declaration

```frisco
entity <NAME>: <ConceptType>.
  description = "<text>"
```

**Example:**
```frisco
entity FIDO: Dog.
  description = "golden retriever"
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

The `=~=` operator compares strings using embedding vectors:

- **String vs String**: Match if cosine similarity ≥ 0.7
- **Array vs String**: Match if ANY element has similarity ≥ 0.7

```frisco
"dog" =~= "canine"              # True
"dog" =~= "mathematics"          # False
["cat", "dog"] =~= "puppy"      # True (dog ≈ puppy)
["red", "blue"] =~= "vehicle"   # False
```

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
concept Man.
  description = "rational animal"
  essentials = ["reason", "free_will"]

concept Mortal.
  attributes = ["finite lifespan"]

entity ARISTOTLE: Man.
  description = "Greek philosopher"

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

The `=~=` operator is Frisco's superpower:

```frisco
# Exact words not needed - meaning matters
"dog" =~= "canine"           # True
"happy" =~= "joyful"         # True
"car" =~= "vehicle"          # True
"tree" =~= "software"        # False
```

Arrays match if ANY element is similar:

```frisco
concept Fruit.
  attributes = ["apple", "banana", "orange"]

# This matches "banana" in the array
Fruit.attributes =~= "tropical fruit"  # True
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
