// Serializer: Convert AST back to Frisco source code

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
    let output = `${rule.head.name}`;

    if (rule.head.parameters.length > 0) {
      output += `(${rule.head.parameters.join(', ')})`;
    }

    output += ` :-\n`;

    rule.body.forEach((condition, idx) => {
      const isLast = idx === rule.body.length - 1;

      if (condition.type === 'SemanticMatch') {
        output += `  ${condition.left.object}.${condition.left.field} ~== "${condition.right}"`;
      } else if (condition.type === 'PredicateCall') {
        output += `  ${condition.name}(${condition.arguments.join(', ')})`;
      }

      output += isLast ? '.\n' : ',\n';
    });

    return output;
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
