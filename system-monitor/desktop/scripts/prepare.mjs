// Assemble app/ for Electron: the backend source and the static frontend build.
//   node scripts/prepare.mjs          copy only (expects ../frontend/out to exist)
//   node scripts/prepare.mjs --build  build the frontend first
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const backend = path.resolve(root, '..', 'backend');
const frontend = path.resolve(root, '..', 'frontend');
const out = path.join(root, 'app');

function run(cmd, args, cwd) {
  console.log(`> ${cmd} ${args.join(' ')}  (${path.relative(root, cwd) || '.'})`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.argv.includes('--build')) {
  if (!fs.existsSync(path.join(frontend, 'node_modules'))) run('npm', ['install'], frontend);
  // The packaged UI talks to its own backend on the same origin.
  fs.writeFileSync(path.join(frontend, '.env.production.local'), 'NEXT_PUBLIC_BACKEND_URL=\n');
  run('npm', ['run', 'build'], frontend);
}

// Plain recursive copy (works on every Node version and file system).
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

const ui = path.join(frontend, 'out');
if (!fs.existsSync(path.join(ui, 'index.html'))) {
  console.error('Frontend build not found. Run with --build, or `npm run build` in ../frontend first.');
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
copyDir(path.join(backend, 'src'), path.join(out, 'backend', 'src'));
fs.copyFileSync(path.join(backend, 'package.json'), path.join(out, 'backend', 'package.json'));
copyDir(ui, path.join(out, 'ui'));

// Keep the backend version in step with the desktop app version.
const desk = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const be = JSON.parse(fs.readFileSync(path.join(out, 'backend', 'package.json'), 'utf8'));
be.version = desk.version;
fs.writeFileSync(path.join(out, 'backend', 'package.json'), JSON.stringify(be, null, 2));

// Licence text shown by the Windows installer and shipped with every build.
fs.copyFileSync(path.resolve(root, '..', '..', 'LICENSE'), path.join(root, 'build', 'LICENSE.txt'));

console.log(`app/ ready (v${desk.version})`);
