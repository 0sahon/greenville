/**
 * Seed grades from Teacher Adaeze's account for Basic 3A students.
 * Signs in as admin → finds teacher profile → inserts grades attributed to teacher.
 *
 * Run: bun run scripts/seed-teacher-grades.mjs
 *
 * PREREQUISITE: Run supabase/fix-teacher-policies.sql in Supabase SQL Editor first,
 * so the teacher can read/write the grades table.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL and anon/publishable key in environment.');
  process.exit(1);
}

const ADMIN_EMAIL = 'admin@greenvillemontessorischools.ng';
const ADMIN_PASSWORD = 'Admin123!';
const TEACHER_EMAIL = 'teacher.adaeze@greenvillemontessorischools.ng';

const TERM = 'First Term';
const ACADEMIC_YEAR = '2025/2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function log(msg) { console.log(`  ✓ ${msg}`); }
function err(msg) { console.error(`  ✗ ${msg}`); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── 1. Sign in as admin ───────────────────────────────────────────────────────
console.log('\n🔑 Signing in as admin…');
const { error: signInErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
if (signInErr) { err(signInErr.message); process.exit(1); }
log('Signed in as admin');

// ── 2. Find teacher.adaeze's profile ─────────────────────────────────────────
console.log('\n👩‍🏫 Looking up teacher profile…');
const { data: teacherProfile, error: tpErr } = await supabase
  .from('profiles')
  .select('id, first_name, last_name')
  .eq('email', TEACHER_EMAIL)
  .single();
if (tpErr || !teacherProfile) { err('Teacher profile not found: ' + (tpErr?.message ?? 'no data')); process.exit(1); }
log(`Found teacher: ${teacherProfile.first_name} ${teacherProfile.last_name} (profile id: ${teacherProfile.id})`);

// ── 3. Find Basic 3A class ────────────────────────────────────────────────────
console.log('\n🏫 Looking up Basic 3A class…');
const { data: classRow, error: clsErr } = await supabase
  .from('classes')
  .select('id, name')
  .eq('name', 'Basic 3A')
  .single();
if (clsErr || !classRow) { err('Class not found: ' + (clsErr?.message ?? 'no data')); process.exit(1); }
log(`Found class: ${classRow.name} (${classRow.id})`);

// ── 4. Find students in Basic 3A ──────────────────────────────────────────────
console.log('\n👦 Loading students in Basic 3A…');
const { data: students, error: stErr } = await supabase
  .from('students')
  .select('id, student_id, profiles:profile_id(first_name, last_name)')
  .eq('class_id', classRow.id)
  .eq('is_active', true)
  .order('student_id');
if (stErr || !students?.length) { err('No students found: ' + (stErr?.message ?? 'no data')); process.exit(1); }
log(`Found ${students.length} students`);
students.forEach(s => log(`  ${s.student_id} — ${s.profiles?.first_name} ${s.profiles?.last_name}`));

// ── 5. Find subjects for Basic 3A ─────────────────────────────────────────────
console.log('\n📚 Loading subjects for Basic 3A…');
const { data: subjectRows, error: subErr } = await supabase
  .from('subjects')
  .select('id, name, code')
  .eq('class_id', classRow.id)
  .eq('term', TERM)
  .eq('academic_year', ACADEMIC_YEAR);

let subjectNames;
if (subErr || !subjectRows?.length) {
  // Fallback: use the standard subjects
  console.log('  (No subjects table records found — using default subject list)');
  subjectNames = ['Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Christian R. K.', 'Quantitative Reasoning'];
} else {
  subjectNames = subjectRows.map(s => s.name);
  log(`Found ${subjectNames.length} subjects: ${subjectNames.join(', ')}`);
}

// ── 6. Delete existing grades for these students (avoid duplicates) ────────────
console.log('\n🗑️  Clearing existing grades for Basic 3A students…');
const studentIds = students.map(s => s.id);
const { error: delErr } = await supabase
  .from('grades')
  .delete()
  .in('student_id', studentIds)
  .eq('term', TERM)
  .eq('academic_year', ACADEMIC_YEAR);
if (delErr) {
  err('Delete failed (may not have permission yet): ' + delErr.message);
  console.log('  Continuing — will insert on top of existing records.');
} else {
  log('Existing grades cleared');
}

// ── 7. Build grade records ────────────────────────────────────────────────────
// Each student gets a distinct performance profile
const studentProfiles = [
  { ca1: [17, 20], ca2: [16, 20], exam: [52, 58] }, // Student 1 — top
  { ca1: [15, 18], ca2: [14, 18], exam: [46, 55] }, // Student 2 — good
  { ca1: [13, 16], ca2: [12, 16], exam: [40, 50] }, // Student 3 — average
  { ca1: [15, 19], ca2: [14, 18], exam: [47, 57] }, // Student 4 — good
  { ca1: [10, 14], ca2: [9, 13],  exam: [33, 44] }, // Student 5 — below avg
];

const gradeInserts = [];
for (let si = 0; si < students.length; si++) {
  const student = students[si];
  const profile = studentProfiles[si] ?? studentProfiles[4];
  for (const subject of subjectNames) {
    gradeInserts.push(
      { student_id: student.id, subject, assessment_type: '1st CA', score: randInt(...profile.ca1), max_score: 20, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: teacherProfile.id },
      { student_id: student.id, subject, assessment_type: '2nd CA', score: randInt(...profile.ca2), max_score: 20, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: teacherProfile.id },
      { student_id: student.id, subject, assessment_type: 'Exam',   score: randInt(...profile.exam), max_score: 60, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: teacherProfile.id },
    );
  }
}

// ── 8. Insert grades ──────────────────────────────────────────────────────────
console.log(`\n📊 Inserting ${gradeInserts.length} grade records (${students.length} students × ${subjectNames.length} subjects × 3 assessments)…`);
const { error: insErr } = await supabase.from('grades').insert(gradeInserts);
if (insErr) {
  err('Grade insert failed: ' + insErr.message);
  console.log('\n⚠️  If you see a RLS error, make sure you have run');
  console.log('   supabase/fix-teacher-policies.sql in the Supabase SQL Editor first.\n');
  process.exit(1);
}
log(`${gradeInserts.length} grades inserted, all attributed to ${teacherProfile.first_name} ${teacherProfile.last_name}`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n✅ Done!\n');
console.log('─────────────────────────────────────────────────────');
console.log(`Teacher: ${teacherProfile.first_name} ${teacherProfile.last_name} — ${TEACHER_EMAIL}`);
console.log(`Class:   ${classRow.name}`);
console.log(`Term:    ${TERM} / ${ACADEMIC_YEAR}`);
console.log(`Grades:  ${gradeInserts.length} records across ${students.length} students`);
console.log('─────────────────────────────────────────────────────');
console.log('\nNow log in as the teacher to verify grades are visible:');
console.log(`  Email:    ${TEACHER_EMAIL}`);
console.log('  Password: Teacher123!\n');

process.exit(0);
