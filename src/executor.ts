// Executor/Interpreter for Frisco Programming Language

import * as AST from './ast.js';
import { SemanticMatcher } from './semantic-matcher.js';

type Bindings = Map<string, string>;

interface KnowledgeBase {
  concepts: Map<string, AST.ConceptDeclaration>;
  entities: Map<string, AST.EntityDeclaration>;
  rules: AST.RuleDeclaration[];
}

export class Executor {
  private kb: KnowledgeBase = {
    concepts: new Map(),
    entities: new Map(),
    rules: [],
  };
  private matcher: SemanticMatcher;

  constructor(threshold: number = 0.7) {
    this.matcher = new SemanticMatcher(threshold);
  }

  async execute(program: AST.Program): Promise<void> {
    // First pass: collect concepts, entities, and rules
    for (const statement of program.statements) {
      if (statement.type === 'ConceptDeclaration') {
        this.kb.concepts.set(statement.name, statement);
      } else if (statement.type === 'EntityDeclaration') {
        this.kb.entities.set(statement.name, statement);
      } else if (statement.type === 'RuleDeclaration') {
        this.kb.rules.push(statement);
      }
    }

    // Second pass: execute queries
    for (const statement of program.statements) {
      if (statement.type === 'Query') {
        await this.executeQuery(statement);
      }
    }
  }

  private async executeQuery(query: AST.Query): Promise<void> {
    const bindings = new Map<string, string>();
    const result = await this.evaluatePredicate(query.predicate, bindings);

    if (result) {
      console.log('True');
      if (bindings.size > 0) {
        console.log('Bindings:');
        for (const [key, value] of bindings) {
          console.log(`  ${key} = ${value}`);
        }
      }
    } else {
      console.log('False');
    }
  }

  private async evaluatePredicate(
    predicate: AST.PredicateCall,
    bindings: Bindings
  ): Promise<boolean> {
    // Try to match against each rule
    for (const rule of this.kb.rules) {
      if (rule.head.name === predicate.name) {
        // Try to unify the predicate with the rule head
        const ruleBindings = new Map(bindings);

        // Bind parameters
        if (rule.head.parameters.length !== predicate.arguments.length) {
          continue;
        }

        for (let i = 0; i < rule.head.parameters.length; i++) {
          const param = rule.head.parameters[i];
          const arg = predicate.arguments[i];

          // Resolve the argument if it's already bound
          const resolvedArg = this.resolve(arg, bindings);
          ruleBindings.set(param, resolvedArg);
        }

        // Evaluate the rule body
        const bodyResult = await this.evaluateConditions(rule.body, ruleBindings);
        if (bodyResult) {
          // Copy bindings back
          for (const [key, value] of ruleBindings) {
            bindings.set(key, value);
          }
          return true;
        }
      }
    }

    return false;
  }

  private async evaluateConditions(
    conditions: AST.Condition[],
    bindings: Bindings
  ): Promise<boolean> {
    for (const condition of conditions) {
      if (condition.type === 'SemanticMatch') {
        const result = await this.evaluateSemanticMatch(condition, bindings);
        if (!result) return false;
      } else if (condition.type === 'PredicateCall') {
        const result = await this.evaluatePredicate(condition, bindings);
        if (!result) return false;
      }
    }
    return true;
  }

  private async evaluateSemanticMatch(
    condition: AST.SemanticMatchCondition,
    bindings: Bindings
  ): Promise<boolean> {
    const { object, field } = condition.left;
    const target = condition.right;

    // Resolve the object name (might be a variable)
    const resolvedObject = this.resolve(object, bindings);

    // Get the field value
    const fieldValue = this.getFieldValue(resolvedObject, field);

    if (fieldValue === null) {
      return false;
    }

    // Perform semantic matching
    return await this.matcher.match(fieldValue, target);
  }

  private resolve(name: string, bindings: Bindings): string {
    return bindings.get(name) ?? name;
  }

  private getFieldValue(objectName: string, fieldName: string): string | string[] | null {
    // Check if it's a concept
    const concept = this.kb.concepts.get(objectName);
    if (concept) {
      if (fieldName === 'description' && concept.description) {
        return concept.description;
      } else if (fieldName === 'attributes') {
        return concept.attributes;
      } else if (fieldName === 'essentials') {
        return concept.essentials;
      }
    }

    // Check if it's an entity
    const entity = this.kb.entities.get(objectName);
    if (entity) {
      if (fieldName === 'description' && entity.description) {
        return entity.description;
      } else if (fieldName === 'conceptType') {
        return entity.conceptType;
      }

      // Also check the entity's concept fields
      const entityConcept = this.kb.concepts.get(entity.conceptType);
      if (entityConcept) {
        if (fieldName === 'attributes') {
          return entityConcept.attributes;
        } else if (fieldName === 'essentials') {
          return entityConcept.essentials;
        }
      }
    }

    return null;
  }

  getKnowledgeBase(): KnowledgeBase {
    return this.kb;
  }
}
