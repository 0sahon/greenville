/**
 * Minimal school graph so student/parent/teacher dashboards have linked rows.
 * Run after `setup-demo-users.mjs` (or `npm run seed:min`).
 *
 * Env: VITE_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * If variables are not set, tries to load repo-root `.env` (when not using `node --env-file`).
 */
import { createClient } from '@supabase/supabase-js';
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function defaultAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

const TEACHER_EMAIL = 'teacher@greenvillemontessorischools.ng';
const STUDENT_EMAIL = 'student@greenvillemontessorischools.ng';
const PARENT_EMAIL = 'parent@greenvillemontessorischools.ng';

const CLASS_NAME = 'Demo Class A';
const DEMO_STUDENT_CODE = 'DEMO-STD-001';
const DEMO_EMPLOYEE_ID = 'DEMO-TCH-001';

async function main() {
  const academicYear = defaultAcademicYear();

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, role')
    .in('email', [TEACHER_EMAIL, STUDENT_EMAIL, PARENT_EMAIL]);

  if (pErr) throw pErr;
  if (!profiles?.length) {
    console.error('No demo profiles found. Run: npm run seed:min   (or setup-demo-users.mjs first)');
    process.exit(1);
  }

  const byEmail = Object.fromEntries(profiles.map((p) => [p.email, p]));
  const teacherProf = byEmail[TEACHER_EMAIL];
  const studentProf = byEmail[STUDENT_EMAIL];
  const parentProf = byEmail[PARENT_EMAIL];
  if (!teacherProf || !studentProf || !parentProf) {
    console.error('Missing one of demo profiles. Expected:', TEACHER_EMAIL, STUDENT_EMAIL, PARENT_EMAIL);
    process.exit(1);
  }

  let { data: teacherRow } = await supabase.from('teachers').select('id').eq('profile_id', teacherProf.id).maybeSingle();
  if (!teacherRow) {
    const { data, error } = await supabase
      .from('teachers')
      .insert({
        profile_id: teacherProf.id,
        employee_id: DEMO_EMPLOYEE_ID,
        qualification: 'B.Ed (Demo)',
        specialization: 'General',
        hire_date: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single();
    if (error) throw error;
    teacherRow = data;
    console.log('✓ Created teachers row for demo teacher');
  } else {
    console.log('✓ Demo teacher row already exists');
  }

  let { data: parentRow } = await supabase.from('parents').select('id').eq('profile_id', parentProf.id).maybeSingle();
  if (!parentRow) {
    const { data, error } = await supabase
      .from('parents')
      .insert({
        profile_id: parentProf.id,
        occupation: 'Demo',
        relationship_to_student: 'parent',
      })
      .select('id')
      .single();
    if (error) throw error;
    parentRow = data;
    console.log('✓ Created parents row for demo parent');
  } else {
    console.log('✓ Demo parent row already exists');
  }

  let { data: classRow } = await supabase.from('classes').select('id, name').eq('name', CLASS_NAME).maybeSingle();
  if (!classRow) {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: CLASS_NAME,
        level: 'basic3',
        academic_year: academicYear,
        teacher_id: teacherProf.id,
        capacity: 30,
      })
      .select('id, name')
      .single();
    if (error) throw error;
    classRow = data;
    console.log(`✓ Created class "${CLASS_NAME}" (${academicYear})`);
  } else {
    console.log(`✓ Class "${CLASS_NAME}" already exists`);
  }

  let { data: studentRow } = await supabase.from('students').select('id, class_id').eq('profile_id', studentProf.id).maybeSingle();
  if (!studentRow) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        profile_id: studentProf.id,
        student_id: DEMO_STUDENT_CODE,
        class_id: classRow.id,
        gender: 'male',
        enrollment_date: new Date().toISOString().slice(0, 10),
        is_active: true,
      })
      .select('id')
      .single();
    if (error) throw error;
    studentRow = data;
    console.log('✓ Created students row for demo student');
  } else {
    if (studentRow.class_id !== classRow.id) {
      const { error: uErr } = await supabase.from('students').update({ class_id: classRow.id }).eq('id', studentRow.id);
      if (uErr) throw uErr;
      console.log('✓ Linked demo student to demo class');
    } else {
      console.log('✓ Demo student row already linked');
    }
  }

  const { data: existingLink } = await supabase
    .from('student_parents')
    .select('id')
    .eq('student_id', studentRow.id)
    .eq('parent_id', parentRow.id)
    .maybeSingle();

  if (!existingLink) {
    const { error: spErr } = await supabase.from('student_parents').insert({
      student_id: studentRow.id,
      parent_id: parentRow.id,
      is_primary: true,
    });
    if (spErr) throw spErr;
    console.log('✓ Linked demo parent ↔ demo student');
  } else {
    console.log('✓ Parent–student link already exists');
  }

  console.log('\nDone. Log in with the demo accounts from DEMO_USERS.md or README.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
