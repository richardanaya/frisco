// Build script for Frisco Web REPL
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const webDir = path.join(rootDir, 'web');

// Bundle the web entry point
await esbuild.build({
  entryPoints: [path.join(webDir, 'src', 'frisco-web.ts')],
  bundle: true,
  outfile: path.join(webDir, 'frisco-web.js'),
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
  minify: false,
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  // Handle Node.js built-ins that shouldn't be in browser
  external: [],
  alias: {
    // transformers.js handles its own web compatibility
  }
});

console.log('Built frisco-web.js');
console.log(`\nWeb REPL built to: ${webDir}`);
console.log('Run "npm run serve:web" to start a local server');
