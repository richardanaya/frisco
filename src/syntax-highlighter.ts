// Syntax Highlighter for Frisco Code

import chalk from 'chalk';

export class SyntaxHighlighter {
  static highlight(code: string): string {
    // Keywords
    code = code.replace(
      /\b(Concept|Entity|description|attributes|essentials)\b/g,
      chalk.blue.bold('$1')
    );

    // Operators
    code = code.replace(/=~=/g, chalk.magenta.bold('=~='));
    code = code.replace(/:-/g, chalk.yellow(':-'));
    code = code.replace(/\?/g, chalk.cyan.bold('?'));

    // String literals
    code = code.replace(/"([^"]*)"/g, chalk.green('"$1"'));

    // Constants (UPPERCASE)
    code = code.replace(/\b([A-Z][A-Z0-9_]*)\b/g, chalk.cyan('$1'));

    // Built-in predicates
    code = code.replace(/\b(print|println|readln|is_unbound|is_bound|is_atom|is_number|is_list|findall|setof)\b/g, chalk.yellow.bold('$1'));

    // Comments
    code = code.replace(/(#.*$)/gm, chalk.gray('$1'));

    return code;
  }

  static highlightOutput(output: string, isTrue: boolean): string {
    if (isTrue) {
      return chalk.green.bold(output);
    } else {
      return chalk.red.bold(output);
    }
  }

  static prompt(): string {
    return chalk.blue.bold('frisco> ');
  }

  static info(text: string): string {
    return chalk.gray(text);
  }

  static error(text: string): string {
    return chalk.red.bold('Error: ') + chalk.red(text);
  }

  static success(text: string): string {
    return chalk.green(text);
  }

  static warning(text: string): string {
    return chalk.yellow(text);
  }
}
