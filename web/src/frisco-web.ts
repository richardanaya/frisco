// Frisco Web REPL - Browser Entry Point
import { Lexer } from '../../src/lexer';
import { Parser } from '../../src/parser';
import { ExecutorWeb } from './executor-web';
import { SemanticMatcherWeb } from './semantic-matcher-web';

// Global state
let executor: ExecutorWeb | null = null;
let matcher: SemanticMatcherWeb | null = null;
let isReady = false;

// DOM elements
const outputEl = document.getElementById('output') as HTMLDivElement;
const inputEl = document.getElementById('input') as HTMLInputElement;
const runBtn = document.getElementById('run') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const progressEl = document.getElementById('model-progress') as HTMLDivElement;
const progressTextEl = document.getElementById('progress-text') as HTMLSpanElement;
const progressFillEl = document.getElementById('progress-fill') as HTMLDivElement;

// Split source into statements by '.', respecting strings
function splitStatements(source: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (char === '"' && (i === 0 || source[i - 1] !== '\\')) {
      inString = !inString;
      current += char;
    } else if (char === '.' && !inString) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget trailing content without a dot
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

function appendOutput(text: string, className: string = '') {
  const line = document.createElement('div');
  line.className = `output-line ${className}`;
  line.textContent = text;
  outputEl.appendChild(line);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function clearOutput() {
  outputEl.innerHTML = '';
}

async function initializeMatcher() {
  matcher = new SemanticMatcherWeb(0.7);
  progressEl.classList.add('visible');

  await matcher.initialize((progress) => {
    if (progress.status === 'progress' && progress.progress !== undefined) {
      const percent = Math.round(progress.progress);
      progressFillEl.style.width = `${percent}%`;
      progressTextEl.textContent = `Downloading model... ${percent}%`;
    } else if (progress.status === 'done') {
      progressTextEl.textContent = 'Model loaded!';
    } else if (progress.status === 'ready') {
      progressEl.classList.remove('visible');
    }
  });

  progressEl.classList.remove('visible');
}

async function initialize() {
  try {
    appendOutput('Initializing embedding model (first load may take a moment)...', 'info');
    await initializeMatcher();

    executor = new ExecutorWeb(
      0.7,
      matcher!,
      (msg) => appendOutput(msg, 'result'),
      async (prompt) => {
        return new Promise((resolve) => {
          const result = window.prompt(prompt || 'Enter input:');
          resolve(result || '');
        });
      }
    );

    isReady = true;
    statusEl.textContent = 'Ready';
    statusEl.className = 'ready';
    inputEl.disabled = false;
    runBtn.disabled = false;
    appendOutput('Ready! Enter Frisco code below.', 'info');
  } catch (error) {
    statusEl.textContent = 'Error';
    statusEl.className = 'error';
    appendOutput(`Failed to initialize: ${error}`, 'error');
  }
}

async function runCode(source: string) {
  if (!isReady || !executor) {
    appendOutput('Not ready yet. Please wait for initialization.', 'error');
    return;
  }

  // Auto-convert bare expressions to queries
  // Split by '.' and process each statement
  let processedSource = source.trim();

  // Split into statements (handling strings that may contain dots)
  const statements = splitStatements(processedSource);
  const processedStatements = statements.map(stmt => {
    stmt = stmt.trim();
    if (!stmt) return '';

    const isDeclaration =
      stmt.startsWith('?') ||
      stmt.startsWith('concept ') ||
      stmt.startsWith('entity ') ||
      stmt.includes(':-');

    const looksLikeQuery =
      /^[a-z_][a-zA-Z0-9_]*\s*\(/.test(stmt) ||  // predicate call
      stmt.includes('=~=') ||                      // semantic match
      /^".*"/.test(stmt) ||                        // starts with string
      /^\[/.test(stmt);                            // starts with list

    if (!isDeclaration && looksLikeQuery) {
      return '? ' + stmt + '.';
    }
    return stmt + '.';
  });

  processedSource = processedStatements.filter(s => s).join(' ');

  appendOutput(source, 'input');

  try {
    const lexer = new Lexer(processedSource);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    await executor.execute(ast);
  } catch (error) {
    if (error instanceof Error) {
      appendOutput(`Error: ${error.message}`, 'error');
    } else {
      appendOutput(`Error: ${error}`, 'error');
    }
  }
}

// Event handlers
runBtn.addEventListener('click', () => {
  const code = inputEl.value.trim();
  if (code) {
    runCode(code);
    inputEl.value = '';
  }
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const code = inputEl.value.trim();
    if (code) {
      runCode(code);
      inputEl.value = '';
    }
  }
});

// Example buttons
document.querySelectorAll('.example-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const code = btn.getAttribute('data-code');
    if (code) {
      inputEl.value = code;
      inputEl.focus();
    }
  });
});

// Start initialization
initialize();
