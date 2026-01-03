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
  | ComparisonCondition
  | ArithmeticEvaluation;

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

export type ComparisonCondition = {
  type: 'Comparison';
  operator: '<' | '>' | '=<' | '>=' | '=:=' | '=\\=';
  left: Expression;
  right: Expression;
};

export type ArithmeticEvaluation = {
  type: 'ArithmeticEvaluation';
  target: Term;
  expression: Expression;
};

export type SemanticMatchCondition = {
  type: 'SemanticMatch';
  left: Term;
  right: Term;
};

export type FieldAccess = {
  type: 'FieldAccess';
  object: string;
  field: string;
};

export type Term =
  | Variable
  | Atom
  | NumberLiteral
  | StringLiteral
  | List
  | CompoundTerm
  | FieldAccess
  | BinaryExpression
  | UnaryExpression;

export type Variable = {
  type: 'Variable';
  name: string;
  anonymous?: boolean;
};

export type Atom = {
  type: 'Atom';
  value: string;
};

export type NumberLiteral = {
  type: 'NumberLiteral';
  value: number;
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

export type BinaryExpression = {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
};

export type UnaryExpression = {
  type: 'UnaryExpression';
  operator: '-' | '+';
  argument: Expression;
};

export type Expression = Term | BinaryExpression | UnaryExpression;

export type BinaryOperator = '+' | '-' | '*' | '/' | 'mod' | '//' | '^';

export type Query = {
  type: 'Query';
  body: Condition[];
};

export type Assignment = {
  type: 'Assignment';
  variable: string;
  value: string;
};
