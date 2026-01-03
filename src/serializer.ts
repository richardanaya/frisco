import * as AST from './ast.js';

export class Serializer {
  static serializeConcept(concept: AST.ConceptDeclaration): string {
    let output = `concept ${concept.name}`;

    if (concept.genus) {
      output += `: ${concept.genus}`;
    }

    output += '\n';

    if (concept.description) {
      output += `  description = "${concept.description}"\n`;
    }

    if (concept.attributes.length > 0) {
      output += `  attributes = [\n`;
      concept.attributes.forEach((attr, idx) => {
        const isLast = idx === concept.attributes.length - 1;
        output += `    "${attr}"${isLast ? '' : ','}\n`;
      });
      output += `  ]\n`;
    }

    if (concept.essentials.length > 0) {
      output += `  essentials = [\n`;
      concept.essentials.forEach((ess, idx) => {
        const isLast = idx === concept.essentials.length - 1;
        output += `    ${ess}${isLast ? '' : ','}\n`;
      });
      output += `  ]\n`;
    }

    return output;
  }

  static serializeEntity(entity: AST.EntityDeclaration): string {
    let output = `entity ${entity.name}: ${entity.conceptType}\n`;

    if (entity.description) {
      output += `  description = "${entity.description}"\n`;
    }

    return output;
  }

  static serializeRule(rule: AST.RuleDeclaration): string {
    const head = `${rule.head.name}(${rule.head.parameters.map((p) => this.termToSource(p)).join(', ')})`;
    const body = rule.body
      .map((c) => this.conditionToSource(c))
      .join(', ');
    return `${head} :- ${body}.`;
  }

  static conditionToSource(cond: AST.Condition): string {
    switch (cond.type) {
      case 'PredicateCall':
        return `${cond.name}(${cond.arguments.map((a) => this.termToSource(a)).join(', ')})`;
      case 'SemanticMatch':
        return `${this.termToSource(cond.left)} ~== ${this.termToSource(cond.right)}`;
      case 'Equality':
        return `${this.termToSource(cond.left)} ${cond.operator} ${this.termToSource(cond.right)}`;
      case 'Comparison':
        return `${this.termToSource(cond.left as AST.Term)} ${cond.operator} ${this.termToSource(cond.right as AST.Term)}`;
      case 'ArithmeticEvaluation':
        return `${this.termToSource(cond.target)} is ${this.termToSource(cond.expression as AST.Term)}`;
    }
  }

  static termToSource(term: AST.Term): string {
    switch (term.type) {
      case 'Variable':
        return term.name;
      case 'Atom':
        return term.value;
      case 'StringLiteral':
        return `"${term.value}"`;
      case 'NumberLiteral':
        return String(term.value);
      case 'FieldAccess':
        return `${term.object}.${term.field}`;
      case 'List': {
        const elements = term.elements.map((e) => this.termToSource(e));
        const tail = term.tail ? `| ${this.termToSource(term.tail)}` : '';
        return `[${elements.join(', ')}${tail ? ' ' + tail : ''}]`;
      }
      case 'CompoundTerm':
        return `${term.functor}(${term.args.map((a) => this.termToSource(a)).join(', ')})`;
      case 'BinaryExpression':
        return `${this.termToSource(term.left as AST.Term)} ${term.operator} ${this.termToSource(term.right as AST.Term)}`;
      case 'UnaryExpression':
        return `${term.operator}${this.termToSource(term.argument as AST.Term)}`;
    }
  }

  static serializeProgram(
    concepts: Map<string, AST.ConceptDeclaration>,
    entities: Map<string, AST.EntityDeclaration>,
    rules: AST.RuleDeclaration[]
  ): string {
    let output = '# Frisco Knowledge Base\n';
    output += `# Generated on ${new Date().toISOString()}\n\n`;

    if (concepts.size > 0) {
      output += '# concepts\n';
      for (const concept of concepts.values()) {
        output += this.serializeConcept(concept);
        output += '\n';
      }
    }

    if (entities.size > 0) {
      output += '# entities\n';
      for (const entity of entities.values()) {
        output += this.serializeEntity(entity);
        output += '\n';
      }
    }

    if (rules.length > 0) {
      output += '# Rules\n';
      for (const rule of rules) {
        output += this.serializeRule(rule);
        output += '\n';
      }
    }

    return output;
  }
}
