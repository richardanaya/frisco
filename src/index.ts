// Frisco Programming Language - Main Entry Point

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Executor } from './executor.js';

export async function runFile(filePath: string): Promise<void> {
  const source = fs.readFileSync(filePath, 'utf-8');
  await run(source);
}

export async function run(source: string): Promise<void> {
  try {
    // Lexical analysis
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // Parsing
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Execution
    const executor = new Executor(0.7); // 0.7 similarity threshold
    await executor.execute(ast);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: frisco <file.frisco>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  runFile(filePath);
}
