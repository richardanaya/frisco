// Build script for Frisco Web REPL
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'web');
const webDir = path.join(rootDir, 'web');

// Ensure dist/web directory exists
fs.mkdirSync(distDir, { recursive: true });

// Copy index.html
fs.copyFileSync(
  path.join(webDir, 'index.html'),
  path.join(distDir, 'index.html')
);
console.log('Copied index.html');

// Copy models directory recursively
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const modelsDir = path.join(webDir, 'models');
if (fs.existsSync(modelsDir)) {
  copyDirRecursive(modelsDir, path.join(distDir, 'models'));
  console.log('Copied models directory');
}

// Bundle the web entry point
await esbuild.build({
  entryPoints: [path.join(webDir, 'src', 'frisco-web.ts')],
  bundle: true,
  outfile: path.join(distDir, 'frisco-web.js'),
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
console.log(`\nWeb REPL built to: ${distDir}`);
console.log('Run "npm run serve:web" to start a local server');
