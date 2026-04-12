/**
 * Full demo dataset: seed-demo-data (teachers, class, students, grades) then seed-full-demo (attendance, fees, etc.).
 * Prerequisite: npm run seed:min (four base users including admin).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import './load-root-env.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, '..');

function run(name) {
  console.log(`\n========== ${name} ==========\n`);
  const r = spawnSync(process.execPath, [join(scriptDir, name)], { cwd: rootDir, stdio: 'inherit', env: process.env });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('seed-demo-data.mjs');
run('seed-full-demo.mjs');
console.log('\n✅ Full seed finished.\n');
