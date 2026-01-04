export type Program = {
  type: 'Program';
  statements: Statement[];
};

export type Statement =
  | ConceptDeclaration
  | EntityDeclaration
  | RuleDeclaration
  | Query
  | Assignment;

export type ConceptDeclaration = {
  type: 'ConceptDeclaration';
  name: string;
  genus: string | null;
  description: string | null;
  attributes: string[];
  essentials: string[];
};

export type EntityDeclaration = {
  type: 'EntityDeclaration';
  name: string;
  conceptType: string;
  description: string | null;
};

export type RuleDeclaration = {
  type: 'RuleDeclaration';
  head: PredicateHead;
  body: Condition[];
};

export type PredicateHead = {
  name: string;
  parameters: Term[];
};

export type Condition =
  | SemanticMatchCondition
  | PredicateCall
  | EqualityCondition
  | Negation
  | Disjunction
  | IfThenElse
  | Cut;

export type PredicateCall = {
  type: 'PredicateCall';
  name: string;
  arguments: Term[];
};

export type EqualityCondition = {
  type: 'Equality';
  operator: '=' | '==';
  left: Term;
  right: Term;
};


export type SemanticMatchCondition = {
  type: 'SemanticMatch';
  left: Term;
  right: Term;
};

export type Negation = {
  type: 'Negation';
  goals: Condition[];
};

export type Disjunction = {
  type: 'Disjunction';
  left: Condition[];
  right: Condition[];
};

export type IfThenElse = {
  type: 'IfThenElse';
  condition: Condition[];
  thenBranch: Condition[];
  elseBranch: Condition[];
};

export type Cut = {
  type: 'Cut';
};

export type FieldAccess = {
  type: 'FieldAccess';
  object: string;
  field: string;
};

export type Term =
  | Variable
  | Atom
  | StringLiteral
  | List
  | CompoundTerm
  | FieldAccess;

export type Variable = {
  type: 'Variable';
  name: string;
  anonymous?: boolean;
};

export type Atom = {
  type: 'Atom';
  value: string;
};


export type StringLiteral = {
  type: 'StringLiteral';
  value: string;
};

export type List = {
  type: 'List';
  elements: Term[];
  tail?: Term | null;
};

export type CompoundTerm = {
  type: 'CompoundTerm';
  functor: string;
  args: Term[];
};

export type Query = {
  type: 'Query';
  body: Condition[];
};

export type Assignment = {
  type: 'Assignment';
  variable: string;
  value: string;
};
