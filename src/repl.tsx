// Frisco REPL (Read-Eval-Print Loop)

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Executor } from './executor.js';
import { Serializer } from './serializer.js';
import { SyntaxHighlighter } from './syntax-highlighter.js';
import { ReplInput } from './MultilineTextInput.js';

interface ReplProps {}

const Repl: React.FC<ReplProps> = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [shouldExit, setShouldExit] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null);

  // Command history navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // File prompt state
  const [filePromptMode, setFilePromptMode] = useState<'save' | 'load' | null>(null);
  const [filePromptResolver, setFilePromptResolver] = useState<((value: string) => void) | null>(null);

  // Create executor with output and input handlers
  const [executor] = useState(() => new Executor(
    0.7,
    // Output handler
    (msg: string) => {
      setHistory(prev => [...prev, msg]);
    },
    // Input handler
    async (prompt?: string): Promise<string> => {
      if (prompt) {
        setHistory(prev => [...prev, prompt]);
      }
      return new Promise((resolve) => {
        setInputResolver(() => resolve);
        setWaitingForInput(true);
      });
    }
  ));

  useEffect(() => {
    if (shouldExit) {
      process.exit(0);
    }
  }, [shouldExit]);

  // Handle Up/Down for command history navigation
  // Use Ctrl+Up/Down when in multiline mode, regular Up/Down for single line
  useInput((inputChar, key) => {
    if (waitingForInput || filePromptMode) {
      return; // Don't handle keys during input prompts
    }

    const isMultiline = input.includes('\n');
    const shouldHandleHistory = isMultiline ? key.ctrl : true;

    // Navigate command history
    if (key.upArrow && shouldHandleHistory) {
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (key.downArrow && shouldHandleHistory) {
      if (historyIndex === -1) return;

      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
  });

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();

    // Clear input immediately
    setInput('');
    setHistoryIndex(-1); // Reset history navigation

    // If waiting for file prompt, resolve it
    if (filePromptMode && filePromptResolver) {
      setHistory(prev => [...prev, `file> ${value}`]);
      filePromptResolver(trimmed);
      setFilePromptResolver(null);
      setFilePromptMode(null);
      return;
    }

    // If waiting for input (read_line), resolve the promise
    if (waitingForInput && inputResolver) {
      setHistory(prev => [...prev, `> ${value}`]);
      inputResolver(trimmed);
      setInputResolver(null);
      setWaitingForInput(false);
      return;
    }

    // Add to command history (but not empty commands)
    if (trimmed) {
      setCommandHistory(prev => [...prev, value]);
    }

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

          // Auto-add query syntax for simple predicates
          if (!code.startsWith('?') &&
              !code.startsWith('concept ') &&
              !code.startsWith('Concept ') &&
              !code.startsWith('entity ') &&
              !code.startsWith('Entity ') &&
              !code.includes(':-')) {
            code = '? ' + code;
          }

          // Queries still need the period at the end
          if (code.startsWith('?') && !code.endsWith('.')) {
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
          '  :help       - Show this help message',
          '  :kb         - Display the current knowledge base',
          '  :kb_save    - Save knowledge base to a .frisco file',
          '  :kb_load    - Load knowledge base from a .frisco file',
          '  :clear      - Clear the screen',
          '  :quit       - Exit the REPL',
          '',
          chalk.bold('Navigation:'),
          '  ↑/↓           - Command history (single line) / Line navigation (multiline)',
          '  Ctrl+↑/↓      - Command history (when in multiline mode)',
          '  ←/→           - Move cursor left/right',
          '',
          chalk.bold('Input Modes:'),
          '  Enter         - Add newline (press Enter twice on empty line to submit)',
          '                  Auto-submits if line ends with "." or starts with ":"',
          '  Shift+Enter   - Force newline (if modifier keys work in your terminal)',
          '  Ctrl+A/E      - Jump to start/end of current line',
          '',
          chalk.bold('Frisco Language:'),
          '  concept <Name>                         - Define a concept',
          '    description = "text"                 - Optional properties',
          '  entity <NAME>: <Type>                  - Define an entity',
          '  <head> :- <conditions>                 - Define a rule',
          '  ? <predicate>                          - Query/execute',
          '',
          chalk.yellow('Note: ? prefix is auto-added for queries'),
          chalk.yellow('      Periods are optional everywhere!'),
          '',
          chalk.bold('Built-in Predicates:'),
          '  println(X)    - Print X with newline',
          '  print(X)      - Print X without newline',
          '  read_line(X)  - Read input and bind to variable X',
          '  nl            - Print a newline',
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

      case 'kb_save':
        setHistory(prev => [...prev, chalk.yellow('Enter filename to save (e.g., myprogram.frisco):')]);
        new Promise<string>((resolve) => {
          setFilePromptResolver(() => resolve);
          setFilePromptMode('save');
        }).then((filename) => {
          try {
            let filepath = filename;
            if (!filepath.endsWith('.frisco')) {
              filepath += '.frisco';
            }
            filepath = path.resolve(filepath);

            const kb = executor.getKnowledgeBase();
            const serialized = Serializer.serializeProgram(
              kb.concepts,
              kb.entities,
              kb.rules
            );

            fs.writeFileSync(filepath, serialized, 'utf-8');
            setHistory(prev => [...prev, chalk.green(`Knowledge base saved to ${filepath}`)]);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setHistory(prev => [...prev, chalk.red(`Error saving: ${message}`)]);
          }
        });
        break;

      case 'kb_load':
        setHistory(prev => [...prev, chalk.yellow('Enter filename to load (e.g., myprogram.frisco):')]);
        new Promise<string>((resolve) => {
          setFilePromptResolver(() => resolve);
          setFilePromptMode('load');
        }).then(async (filename) => {
          try {
            let filepath = filename;
            if (!filepath.endsWith('.frisco')) {
              filepath += '.frisco';
            }
            filepath = path.resolve(filepath);

            const source = fs.readFileSync(filepath, 'utf-8');
            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();

            await executor.execute(ast);
            setHistory(prev => [...prev, chalk.green(`Knowledge base loaded from ${filepath}`)]);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setHistory(prev => [...prev, chalk.red(`Error loading: ${message}`)]);
          }
        });
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

      {!shouldExit && (() => {
        const promptText = filePromptMode ? "file> " : waitingForInput ? "input> " : "frisco> ";
        return (
          <Box flexDirection="row">
            <Text color={filePromptMode ? "cyan" : waitingForInput ? "yellow" : "green"}>
              {promptText}
            </Text>
            <ReplInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              prompt={promptText}
            />
          </Box>
        );
      })()}
    </Box>
  );
};

export function startRepl(): void {
  render(<Repl />);
}
