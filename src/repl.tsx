// Frisco REPL (Read-Eval-Print Loop)

import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Executor } from './executor.js';
import { Serializer } from './serializer.js';
import { SyntaxHighlighter } from './syntax-highlighter.js';

interface InputLineProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

const InputLine: React.FC<InputLineProps> = ({ value, onChange, onSubmit }) => {
  return (
    <Box>
      <Text color="green">frisco&gt; </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </Box>
  );
};

interface ReplProps {}

const Repl: React.FC<ReplProps> = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [shouldExit, setShouldExit] = useState(false);

  // Create executor with output handler that adds to history
  const [executor] = useState(() => new Executor(0.7, (msg: string) => {
    setHistory(prev => [...prev, msg]);
  }));

  useEffect(() => {
    if (shouldExit) {
      process.exit(0);
    }
  }, [shouldExit]);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();

    // Clear input immediately
    setInput('');

    // Add to history
    setHistory(prev => [...prev, `frisco> ${value}`]);

    // Handle REPL commands
    if (trimmed.startsWith(':')) {
      handleCommand(trimmed);
      return;
    }

    // Execute Frisco code asynchronously
    if (trimmed) {
      // Use setImmediate to ensure state updates happen first
      setImmediate(async () => {
        try {
          let code = trimmed;

          // Auto-add query syntax for convenience
          // If it doesn't start with ?, ?-, Concept, Entity, or an identifier followed by :-
          // assume it's a query and add ?- prefix
          if (!code.startsWith('?') &&
              !code.startsWith('concept ') &&
              !code.startsWith('Concept ') &&
              !code.startsWith('entity ') &&
              !code.startsWith('Entity ') &&
              !code.includes(':-')) {
            code = '?- ' + code;
          }

          // Auto-add trailing period if missing
          if (!code.endsWith('.')) {
            code = code + '.';
          }

          // Lex, parse, and execute
          const lexer = new Lexer(code);
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          const ast = parser.parse();

          await executor.execute(ast);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setHistory(prev => [...prev, chalk.red(`Error: ${message}`)]);
        }
      });
    }
  };

  const handleCommand = (cmd: string) => {
    const command = cmd.slice(1).toLowerCase();

    switch (command) {
      case 'help':
        setHistory(prev => [
          ...prev,
          '',
          chalk.bold('Frisco REPL Commands:'),
          '  :help     - Show this help message',
          '  :kb       - Display the current knowledge base',
          '  :clear    - Clear the screen',
          '  :quit     - Exit the REPL',
          '',
          chalk.bold('Frisco Language:'),
          '  Concept <Name>. <properties>          - Define a concept',
          '  Entity <NAME>: <Type>. <properties>   - Define an entity',
          '  <head> :- <conditions>.               - Define a rule',
          '  ?- <predicate>.                       - Query/execute',
          '',
        ]);
        break;

      case 'kb':
        const kb = executor.getKnowledgeBase();
        const serialized = Serializer.serializeProgram(
          kb.concepts,
          kb.entities,
          kb.rules
        );
        const highlighted = SyntaxHighlighter.highlight(serialized);
        setHistory(prev => [...prev, '', highlighted, '']);
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'quit':
      case 'exit':
        setHistory(prev => [...prev, chalk.green('Goodbye!')]);
        setShouldExit(true);
        break;

      default:
        setHistory(prev => [...prev, chalk.red(`Unknown command: ${cmd}`)]);
        setHistory(prev => [...prev, chalk.yellow('Type :help for available commands')]);
    }
  };

  return (
    <Box flexDirection="column">
      {history.length === 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">Frisco Programming Language REPL</Text>
          <Text dimColor>Type :help for available commands, :quit to exit</Text>
          <Text dimColor>Version 0.1.0</Text>
          <Text></Text>
        </Box>
      )}

      {history.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}

      {!shouldExit && (
        <InputLine
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
};

export function startRepl(): void {
  render(<Repl />);
}
