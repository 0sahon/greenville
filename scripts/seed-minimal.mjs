/**
 * One command: demo users (auth + profiles) + minimal class/student/parent graph.
 *
 * Usage: npm run seed:min
 *
 * Requires repo-root `.env` with VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (same as `setup-demo-users.mjs`).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, '..');

function loadDotEnv() {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined && v) process.env[k] = v;
  }
}

loadDotEnv();

function runNode(scriptName) {
  const r = spawnSync(process.execPath, [join(scriptDir, scriptName)], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('\n--- 1/2 Demo users (Supabase Auth + profiles) ---\n');
runNode('setup-demo-users.mjs');

console.log('\n--- 2/2 Minimal class, student, parent link ---\n');
runNode('seed-minimal-test.mjs');

console.log('\nAll set. Run: npm run dev\n');
