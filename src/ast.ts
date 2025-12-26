// AST Node Types for Frisco Programming Language

export type Program = {
  type: 'Program';
  statements: Statement[];
};

export type Statement =
  | ConceptDeclaration
  | EntityDeclaration
  | RuleDeclaration
  | Query;

// Concept Man.
//   description = "rational animal"
//   attributes = [...]
//   essentials = [...]
export type ConceptDeclaration = {
  type: 'ConceptDeclaration';
  name: string;
  description: string | null;
  attributes: string[];
  essentials: string[];
};

// Entity SOCRATES: Man.
//   description = "Socrates"
export type EntityDeclaration = {
  type: 'EntityDeclaration';
  name: string;
  conceptType: string;
  description: string | null;
};

// all_men_mortal :-
//   Man.attributes ~== "limited existence".
export type RuleDeclaration = {
  type: 'RuleDeclaration';
  head: PredicateHead;
  body: Condition[];
};

export type PredicateHead = {
  name: string;
  parameters: string[];
};

export type Condition =
  | SemanticMatchCondition
  | PredicateCall;

// Man.attributes ~== "some text"
export type SemanticMatchCondition = {
  type: 'SemanticMatch';
  left: FieldAccess;
  right: string;
};

// target.description
export type FieldAccess = {
  type: 'FieldAccess';
  object: string;
  field: string;
};

// mortal(SOCRATES)
export type PredicateCall = {
  type: 'PredicateCall';
  name: string;
  arguments: Argument[];
};

export type Argument = string; // Variable or entity name

// ?- mortal(SOCRATES).
export type Query = {
  type: 'Query';
  predicate: PredicateCall;
};
