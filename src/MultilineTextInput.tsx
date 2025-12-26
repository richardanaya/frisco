// Custom Multiline Text Input Component for Ink

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface ReplInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  prompt?: string;
}

export const ReplInput: React.FC<ReplInputProps> = ({
  value,
  onChange,
  onSubmit,
  prompt = '',
}) => {
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorColumn, setCursorColumn] = useState(0);

  // Split value into lines
  const lines = value.split('\n');

  // Ensure cursor is within bounds
  useEffect(() => {
    const maxLine = Math.max(0, lines.length - 1);
    const maxColumn = lines[cursorLine]?.length || 0;

    if (cursorLine > maxLine) {
      setCursorLine(maxLine);
    }
    if (cursorColumn > maxColumn) {
      setCursorColumn(maxColumn);
    }
  }, [value, cursorLine, cursorColumn, lines]);

  useInput((input, key) => {
    const currentLine = lines[cursorLine] || '';
    const beforeCursor = currentLine.slice(0, cursorColumn);
    const afterCursor = currentLine.slice(cursorColumn);

    // Handle Enter key with smart detection
    if (key.return) {
      // Force new line with modifiers (Shift/Ctrl/Alt+Enter)
      if (key.shift || key.ctrl || key.meta) {
        const newLines = [...lines];
        newLines[cursorLine] = beforeCursor;
        newLines.splice(cursorLine + 1, 0, afterCursor);
        onChange(newLines.join('\n'));
        setCursorLine(cursorLine + 1);
        setCursorColumn(0);
        return;
      }

      // Commands (starting with :) always submit immediately
      const trimmedValue = value.trim();
      if (trimmedValue.startsWith(':')) {
        onSubmit(value);
        return;
      }

      // If current line is empty and we're on the last line, submit
      // (This allows double-Enter to submit, like Python REPL)
      if (currentLine.trim() === '' && cursorLine === lines.length - 1) {
        onSubmit(value);
        return;
      }

      // If value ends with period, submit
      if (trimmedValue.endsWith('.')) {
        onSubmit(value);
        return;
      }

      // Otherwise, add new line
      const newLines = [...lines];
      newLines[cursorLine] = beforeCursor;
      newLines.splice(cursorLine + 1, 0, afterCursor);
      onChange(newLines.join('\n'));
      setCursorLine(cursorLine + 1);
      setCursorColumn(0);
      return;
    }

    // Handle arrow keys (only for multiline navigation)
    if (key.upArrow) {
      // Only handle if we're in multiline mode and can move up
      if (lines.length > 1 && cursorLine > 0) {
        const newLine = cursorLine - 1;
        const newLineLength = lines[newLine].length;
        setCursorLine(newLine);
        setCursorColumn(Math.min(cursorColumn, newLineLength));
        return;
      }
      // Don't return - let parent handle for history navigation
    }

    if (key.downArrow) {
      // Only handle if we're in multiline mode and can move down
      if (lines.length > 1 && cursorLine < lines.length - 1) {
        const newLine = cursorLine + 1;
        const newLineLength = lines[newLine].length;
        setCursorLine(newLine);
        setCursorColumn(Math.min(cursorColumn, newLineLength));
        return;
      }
      // Don't return - let parent handle for history navigation
    }

    if (key.leftArrow) {
      if (cursorColumn > 0) {
        setCursorColumn(cursorColumn - 1);
      } else if (cursorLine > 0) {
        // Move to end of previous line
        setCursorLine(cursorLine - 1);
        setCursorColumn(lines[cursorLine - 1].length);
      }
      return;
    }

    if (key.rightArrow) {
      if (cursorColumn < currentLine.length) {
        setCursorColumn(cursorColumn + 1);
      } else if (cursorLine < lines.length - 1) {
        // Move to start of next line
        setCursorLine(cursorLine + 1);
        setCursorColumn(0);
      }
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      if (cursorColumn > 0) {
        // Delete character before cursor
        const newLine = beforeCursor.slice(0, -1) + afterCursor;
        const newLines = [...lines];
        newLines[cursorLine] = newLine;
        onChange(newLines.join('\n'));
        setCursorColumn(cursorColumn - 1);
      } else if (cursorLine > 0) {
        // Merge with previous line
        const prevLine = lines[cursorLine - 1];
        const newLines = [...lines];
        newLines[cursorLine - 1] = prevLine + currentLine;
        newLines.splice(cursorLine, 1);
        onChange(newLines.join('\n'));
        setCursorLine(cursorLine - 1);
        setCursorColumn(prevLine.length);
      }
      return;
    }

    // Handle Ctrl+A (Home) - move to start of line
    if (key.ctrl && input === 'a') {
      setCursorColumn(0);
      return;
    }

    // Handle Ctrl+E (End) - move to end of line
    if (key.ctrl && input === 'e') {
      setCursorColumn(currentLine.length);
      return;
    }

    // Handle regular character input
    if (input && !key.ctrl && !key.meta) {
      const newLine = beforeCursor + input + afterCursor;
      const newLines = [...lines];
      newLines[cursorLine] = newLine;
      onChange(newLines.join('\n'));
      setCursorColumn(cursorColumn + input.length);
    }
  });

  // Calculate continuation prefix
  const promptLength = prompt.replace(/\x1b\[[0-9;]*m/g, '').length;
  const continuationPrefix = '...' + ' '.repeat(Math.max(0, promptLength - 3));

  // Render the text with cursor
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    // Empty input - just show cursor
    return <Text inverse> </Text>;
  }

  // For multiline, we need to handle it differently to avoid Box layout issues
  if (lines.length === 1) {
    // Single line - render normally
    const line = lines[0];
    const beforeCursor = line.slice(0, cursorColumn);
    const atCursor = line[cursorColumn] || ' ';
    const afterCursor = line.slice(cursorColumn + 1);
    return (
      <Text>
        {beforeCursor}<Text inverse>{atCursor}</Text>{afterCursor}
      </Text>
    );
  }

  // Multiple lines - use flexDirection column and explicit line breaks
  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => {
        const beforeCursor = line.slice(0, cursorColumn);
        const atCursor = line[cursorColumn] || ' ';
        const afterCursor = line.slice(cursorColumn + 1);

        if (lineIndex === 0) {
          // First line - no prefix
          if (cursorLine === 0) {
            return (
              <Text key={lineIndex}>
                {beforeCursor}<Text inverse>{atCursor}</Text>{afterCursor}
              </Text>
            );
          } else {
            return <Text key={lineIndex}>{line}</Text>;
          }
        } else {
          // Continuation lines - show prefix
          if (lineIndex === cursorLine) {
            return (
              <Text key={lineIndex}>
                <Text dimColor>{continuationPrefix}</Text>{beforeCursor}<Text inverse>{atCursor}</Text>{afterCursor}
              </Text>
            );
          } else {
            return (
              <Text key={lineIndex}>
                <Text dimColor>{continuationPrefix}</Text>{line}
              </Text>
            );
          }
        }
      })}
    </Box>
  );
};
