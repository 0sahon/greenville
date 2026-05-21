/**
 * seed-presentation-demo.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE-COMMAND full demo seed for GMS Portal presentations & client training.
 *
 * Seeds ALL three classes (Pre-KG, KG 1, Basic 3A) with rich, realistic data:
 *   ✔ 2 parent accounts per class (6 parents total, linked to students)
 *   ✔ Attendance (4 weeks, all classes)
 *   ✔ Timetables (all classes, full week)
 *   ✔ LMS: courses/topics, assignments, class materials, lesson plans, submissions
 *   ✔ Fees (multiple fee types, mixed payment statuses)
 *   ✔ Health records
 *   ✔ Announcements (6 realistic school notices)
 *   ✔ Messages (admin↔teacher, admin→parents broadcast, teacher→admin reply)
 *   ✗ Transport excluded
 *
 * PREREQUISITES: Run seed-demo-data.mjs first to create students, teachers,
 *                grades, and result sheets.
 *
 * USAGE:
 *   node scripts/seed-presentation-demo.mjs          # seed everything
 *   node scripts/seed-presentation-demo.mjs --clear  # remove all demo data
 *
 * Loads .env automatically via load-root-env.
 */

import './load-root-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TERM         = 'First Term';
const YEAR         = '2025/2026';
const ADMIN_EMAIL  = 'admin@greenvillemontessorischools.ng';
const ADMIN_PASS   = 'Admin123!';
const PARENT_PASS  = 'Parent123!';

const CLEAR_MODE = process.argv.includes('--clear');

// ── Helpers ──────────────────────────────────────────────────────────────────
const log  = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.warn(`  ⚠ ${m}`);
const fail = (m) => console.error(`  ✗ ${m}`);

function schoolDaysBack(weeks) {
  const days = [];
  const today = new Date();
  for (let d = 1; d <= weeks * 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dow = date.getDay();
    if (dow >= 1 && dow <= 5) days.push(date.toISOString().split('T')[0]);
  }
  return days.sort();
}
function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}
function isAuthTaken(msg) {
  return (msg||'').toLowerCase().includes('already') || (msg||'').toLowerCase().includes('registered');
}

// ── Sign in ───────────────────────────────────────────────────────────────────
console.log('\n🔑 Signing in as admin...');
const { error: signInErr } = await supabase.auth.signInWithPassword({
  email: ADMIN_EMAIL, password: ADMIN_PASS,
});
if (signInErr) { fail(signInErr.message); process.exit(1); }
const { data: { user } } = await supabase.auth.getUser();
const { data: adminProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
const adminId = adminProfile.id;
log('Signed in as admin');

// ── Load existing demo accounts ───────────────────────────────────────────────
console.log('\n📥 Loading seed data...');

const CLASS_NAMES = ['Pre-KG', 'KG 1', 'Basic 3A'];

const { data: classRows } = await supabase
  .from('classes')
  .select('id, name, level')
  .in('name', CLASS_NAMES)
  .eq('academic_year', YEAR);

if (!classRows?.length) {
  fail('No demo classes found. Run seed-demo-data.mjs first.');
  process.exit(1);
}
log(`Found ${classRows.length} classes: ${classRows.map(c => c.name).join(', ')}`);

// Load all demo students
const { data: allStudents } = await supabase
  .from('students')
  .select('id, student_id, class_id, profiles:profile_id(id, first_name, last_name, email)')
  .in('class_id', classRows.map(c => c.id))
  .order('student_id');

const studentsByClass = {};
for (const cls of classRows) {
  studentsByClass[cls.name] = (allStudents || []).filter(s => s.class_id === cls.id);
}
log(`Found ${allStudents?.length ?? 0} demo students`);

// Load demo teachers
const { data: demoTeacherProfiles } = await supabase
  .from('profiles')
  .select('id, first_name, last_name, email')
  .like('email', 'teacher.%@greenvillemontessorischools.ng');


const t1Profile = demoTeacherProfiles?.find(p => p.email.includes('adaeze')) ?? demoTeacherProfiles?.[0];
const t2Profile = demoTeacherProfiles?.find(p => p.email.includes('emeka'))  ?? demoTeacherProfiles?.[1] ?? t1Profile;
const t3Profile = demoTeacherProfiles?.find(p => p.email.includes('ifeoma')) ?? demoTeacherProfiles?.[2] ?? t1Profile;
const t1Id = t1Profile?.id ?? null;
const t2Id = t2Profile?.id ?? null;
const t3Id = t3Profile?.id ?? null;
log(`Found ${demoTeacherProfiles?.length ?? 0} teachers`);

// ═════════════════════════════════════════════════════════════════════════════
//  CLEAR MODE — remove all demo data seeded by this script
// ═════════════════════════════════════════════════════════════════════════════
if (CLEAR_MODE) {
  console.log('\n🧹 CLEAR MODE — removing all presentation demo data...\n');

  const allStudentIds = (allStudents||[]).map(s => s.id);

  // Fees
  if (allStudentIds.length) {
    const { error } = await supabase.from('fees').delete().in('student_id', allStudentIds).eq('term', TERM).eq('academic_year', YEAR);
    if (error) warn(`fees: ${error.message}`); else log('Fees cleared');
  }

  // Health records
  if (allStudentIds.length) {
    const { error } = await supabase.from('health_records').delete().in('student_id', allStudentIds);
    if (error) warn(`health: ${error.message}`); else log('Health records cleared');
  }

  // Attendance
  if (allStudentIds.length) {
    const { error } = await supabase.from('attendance').delete().in('student_id', allStudentIds);
    if (error) warn(`attendance: ${error.message}`); else log('Attendance cleared');
  }

  // Timetable
  if (classRows.length) {
    const { error } = await supabase.from('timetable').delete().in('class_id', classRows.map(c => c.id)).eq('term', TERM).eq('academic_year', YEAR);
    if (error) warn(`timetable: ${error.message}`); else log('Timetables cleared');
  }

  // Announcements posted by admin demo
  const demoTitles = [
    'First Term Examination Schedule — 2025/2026',
    'End-of-Term Prize Giving Day — 7th March 2026',
    'School Fees Reminder — Second Term 2025/2026',
    'Mid-Term Break — 10th to 14th February 2026',
    'Staff Meeting — Friday 27th February 2026',
    'Interhouse Sports Competition — 21st February 2026',
  ];
  const { error: annErr } = await supabase.from('announcements').delete().in('title', demoTitles).eq('published_by', adminId);
  if (annErr) warn(`announcements: ${annErr.message}`); else log('Announcements cleared');

  // Messages
  const demoSubjects = [
    'Welcome to the First Term 2025/2026 — GMS Portal',
    'Staff Briefing — First Term Academic Calendar 2025/2026',
    'Basic 3A Class Performance — Mid Term Review',
    'Re: Basic 3A Class Performance — Mid Term Review',
    'KG 1 Literacy Progress — First Term Update',
    'Pre-KG Morning Routine — Parent Guidance',
  ];
  const { error: msgErr } = await supabase.from('messages').delete().in('subject', demoSubjects);
  if (msgErr) warn(`messages: ${msgErr.message}`); else log('Messages cleared');

  // LMS — courses, assignments, materials, lesson_plans, submissions for demo classes
  if (classRows.length) {
    const classIds = classRows.map(c => c.id);
    const { data: demoCourses } = await supabase.from('courses').select('id').in('class_id', classIds).eq('term', TERM).eq('academic_year', YEAR);
    if (demoCourses?.length) {
      const courseIds = demoCourses.map(c => c.id);
      await supabase.from('lesson_plans').delete().in('course_id', courseIds);
      await supabase.from('course_materials').delete().in('course_id', courseIds);

      const { data: demoAssignments } = await supabase.from('assignments').select('id').in('course_id', courseIds);
      if (demoAssignments?.length) {
        const assignIds = demoAssignments.map(a => a.id);
        await supabase.from('submissions').delete().in('assignment_id', assignIds);
        await supabase.from('assignments').delete().in('id', assignIds);
      }
      await supabase.from('courses').delete().in('id', courseIds);
      log('LMS content cleared (courses, assignments, materials, lesson plans, submissions)');
    }
  }

  // Parents — find demo parent profiles and remove
  const demoParentEmails = [
    'parent.ngozi.eze@greenvillemontessorischools.ng',
    'parent.chukwuemeka.chukwu@greenvillemontessorischools.ng',
    'parent.adaobi.eze@greenvillemontessorischools.ng',
    'parent.uchenna.okafor@greenvillemontessorischools.ng',
    'parent.bola.nwosu@greenvillemontessorischools.ng',
    'parent.segun.adeyemi@greenvillemontessorischools.ng',
  ];
  const { data: parentProfiles } = await supabase.from('profiles').select('id').in('email', demoParentEmails);
  if (parentProfiles?.length) {
    const pids = parentProfiles.map(p => p.id);
    const { data: parentRecords } = await supabase.from('parents').select('id').in('profile_id', pids);
    if (parentRecords?.length) {
      await supabase.from('student_parents').delete().in('parent_id', parentRecords.map(p => p.id));
      await supabase.from('parents').delete().in('id', parentRecords.map(p => p.id));
    }
    await supabase.from('profiles').delete().in('id', pids);
    log('Parent accounts cleared');
  }

  console.log('\n✅ All presentation demo data removed.\n');
  console.log('  Note: Student, teacher, class, grade, and result data (from seed-demo-data.mjs)');
  console.log('  were NOT removed. Run seed-demo-data.mjs --clear (if it exists) for that.\n');
  process.exit(0);
}

// ═════════════════════════════════════════════════════════════════════════════
//  SEED MODE
// ═════════════════════════════════════════════════════════════════════════════

// ── Helper: ensure parent account ────────────────────────────────────────────
async function ensureParent(email, firstName, lastName, phone) {
  const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existing) return existing;

  const { data: userId, error } = await supabase.rpc('admin_create_user', {
    user_email: email,
    user_password: PARENT_PASS,
    user_first_name: firstName,
    user_last_name: lastName,
    profile_role: 'parent',
  });
  if (error) {
    if (isAuthTaken(error.message)) {
      const { data: again } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (again) return again;
    }
    throw new Error(`ensureParent(${email}): ${error.message}`);
  }
  const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
  if (phone) await supabase.from('profiles').update({ phone }).eq('id', prof.id);
  return prof;
}

// ── 1. PARENTS ────────────────────────────────────────────────────────────────
console.log('\n👨‍👩‍👧 Creating parent accounts...');

/**
 * 2 parents per class = 6 total.
 * Each parent is linked to the first student in their class (index 0).
 * Second parent per class is linked to the second student (index 1).
 */
const parentDefs = [
  // Pre-KG parents
  { email: 'parent.ngozi.eze@greenvillemontessorischools.ng',         firstName: 'Ngozi',       lastName: 'Eze',      phone: '08031112222', occupation: 'Civil Servant',      address: '12 Ugbor Road, GRA, Benin City', classIdx: 'Pre-KG', studentIdx: 0, rel: 'Mother' },
  { email: 'parent.chukwuemeka.chukwu@greenvillemontessorischools.ng', firstName: 'Chukwuemeka', lastName: 'Chukwu',  phone: '08057778888', occupation: 'Business Owner',     address: '5 Sapele Road, Benin City',       classIdx: 'Pre-KG', studentIdx: 1, rel: 'Father' },
  // KG 1 parents
  { email: 'parent.adaobi.eze@greenvillemontessorischools.ng',         firstName: 'Adaobi',      lastName: 'Eze',      phone: '07032223333', occupation: 'Medical Doctor',     address: '33 Adesuwa Road, GRA, Benin City', classIdx: 'KG 1', studentIdx: 0, rel: 'Mother' },
  { email: 'parent.uchenna.okafor@greenvillemontessorischools.ng',     firstName: 'Uchenna',     lastName: 'Okafor',   phone: '07058889999', occupation: 'Engineer',           address: '18 Ikpoba Hill, Benin City',       classIdx: 'KG 1', studentIdx: 1, rel: 'Father' },
  // Basic 3A parents
  { email: 'parent.bola.nwosu@greenvillemontessorischools.ng',         firstName: 'Bola',        lastName: 'Nwosu',    phone: '08021113333', occupation: 'Lecturer',           address: '7 Sokponba Road, Benin City',     classIdx: 'Basic 3A', studentIdx: 0, rel: 'Mother' },
  { email: 'parent.segun.adeyemi@greenvillemontessorischools.ng',      firstName: 'Segun',       lastName: 'Adeyemi',  phone: '08044445555', occupation: 'Accountant',         address: '24 Ugbowo, Benin City',           classIdx: 'Basic 3A', studentIdx: 1, rel: 'Father' },
];

for (const pd of parentDefs) {
  try {
    const prof = await ensureParent(pd.email, pd.firstName, pd.lastName, pd.phone);
    // Upsert parents row
    const { data: parentRow } = await supabase
      .from('parents')
      .upsert({ profile_id: prof.id, occupation: pd.occupation, address: pd.address, relationship_to_student: pd.rel }, { onConflict: 'profile_id' })
      .select('id').single();

    if (parentRow) {
      const students = studentsByClass[pd.classIdx] || [];
      const student = students[pd.studentIdx];
      if (student) {
        await supabase.from('student_parents').upsert(
          { parent_id: parentRow.id, student_id: student.id, is_primary: pd.studentIdx === 0 },
          { onConflict: 'parent_id,student_id' }
        );
      }
    }
    log(`Parent: ${pd.firstName} ${pd.lastName} (${pd.email} / ${PARENT_PASS}) → ${pd.classIdx}`);
  } catch (e) {
    fail(`Parent ${pd.firstName}: ${e.message}`);
  }
}

// ── 2. ATTENDANCE — 4 weeks, all classes ──────────────────────────────────────
console.log('\n📅 Seeding attendance (all classes, 4 weeks)...');

const schoolDays = schoolDaysBack(4);
const attendanceRows = [];

for (const cls of classRows) {
  const students = studentsByClass[cls.name] || [];
  for (const student of students) {
    const si = students.indexOf(student);
    for (const day of schoolDays) {
      let status = 'present';
      const roll = Math.random();
      if (si === 4 && roll < 0.2) status = 'absent';
      else if (si === 2 && roll < 0.12) status = 'absent';
      else if (si === 0 && roll < 0.03) status = 'late';
      else if (roll < 0.05) status = 'late';
      else if (roll < 0.06) status = 'absent';

      attendanceRows.push({
        student_id: student.id,
        date: day,
        status,
        marked_by: adminId,
        notes: status === 'absent' ? 'Parent notified' : null,
      });
    }
  }
}

for (let i = 0; i < attendanceRows.length; i += 100) {
  const { error } = await supabase.from('attendance').upsert(attendanceRows.slice(i, i + 100), { onConflict: 'student_id,date' });
  if (error) warn(`Attendance chunk: ${error.message}`);
}
log(`${attendanceRows.length} attendance records (${classRows.length} classes × ${schoolDays.length} days)`);

// ── 3. TIMETABLES — all classes, full week ────────────────────────────────────
console.log('\n🕐 Seeding timetables...');

const PERIODS = [
  { period: 1, start: '08:00', end: '08:45' },
  { period: 2, start: '08:45', end: '09:30' },
  { period: 3, start: '09:30', end: '10:15' },
  { period: 4, start: '10:15', end: '11:00' },
  { period: 5, start: '11:00', end: '11:45' },
  { period: 6, start: '11:45', end: '12:30' },
  { period: 7, start: '13:15', end: '14:00' },
  { period: 8, start: '14:00', end: '14:45' },
];

const schedules = {
  'Pre-KG': {
    Monday:    ['Literacy', 'Numeracy', 'Creative Play', 'Phonics', 'Understanding', 'Bible Studies', 'Social Habit', 'Scribbling'],
    Tuesday:   ['Phonics', 'Literacy', 'Numeracy', 'Care of Self', 'Creative Play', 'Individual Behaviour', 'Punctuality', 'Social Habit'],
    Wednesday: ['Numeracy', 'Phonics', 'Bible Studies', 'Literacy', 'Scribbling', 'Numeracy', 'Care of Self', 'Creative Play'],
    Thursday:  ['Bible Studies', 'Numeracy', 'Literacy', 'Phonics', 'Social Habit', 'Creative Play', 'Understanding', 'Obedience'],
    Friday:    ['Care of Self', 'Literacy', 'Obedience', 'Numeracy', 'Individual Behaviour', 'Phonics', 'Assembly', 'Free Play'],
  },
  'KG 1': {
    Monday:    ['Numeracy Skills', 'Literacy Development', 'Phonic Skills', 'Writing Skills', 'Numeracy Skills', 'Social Habit', 'Bible Knowledge', 'Practice Life Exercise'],
    Tuesday:   ['Literacy Development', 'Numeracy Skills', 'Cultural Subject', 'Phonic Skills', 'General Science', 'Literacy Development', 'Writing Skills', 'Music'],
    Wednesday: ['Phonic Skills', 'Writing Skills', 'Numeracy Skills', 'Cultural Subject', 'Sensorial', 'Bible Knowledge', 'General Science', 'Coding'],
    Thursday:  ['Social Habit', 'Phonic Skills', 'Literacy Development', 'General Science', 'Writing Skills', 'Numeracy Skills', 'Practice Life Exercise', 'French'],
    Friday:    ['Bible Knowledge', 'Literacy Development', 'Numeracy Skills', 'Sensorial', 'Cultural Subject', 'Social Habit', 'Music', 'Assembly / Circle Time'],
  },
  'Basic 3A': {
    Monday:    ['Mathematics', 'English Language', 'Basic Science', 'Social Studies',    'Mathematics',            'Christian R. K.',        'Quantitative Reasoning', 'Physical Education'],
    Tuesday:   ['English Language', 'Mathematics', 'Social Studies', 'Basic Science',   'English Language',       'Quantitative Reasoning', 'Mathematics',            'Creative Arts'],
    Wednesday: ['Basic Science', 'Quantitative Reasoning', 'Mathematics', 'English Language', 'Social Studies',  'Mathematics',            'English Language',       'Computer Studies'],
    Thursday:  ['Social Studies', 'English Language', 'Christian R. K.', 'Mathematics', 'Quantitative Reasoning', 'Basic Science',          'English Language',       'Agricultural Science'],
    Friday:    ['Quantitative Reasoning', 'Basic Science', 'English Language', 'Mathematics', 'Christian R. K.', 'Social Studies',          'Assembly / Moral Edu',   'Library / Reading'],
  },
};

const subjectTeacher = {
  'Pre-KG': { default: t1Id },
  'KG 1':   { default: t2Id },
  'Basic 3A': {
    'Mathematics/Quantitative': t1Id, 'Basic Science': t1Id, 'Agricultural Science': t1Id,
    'English Language/Verbal Reasoning': t2Id, 'Religion & National Values': t2Id, 'French': t2Id,
    default: t3Id,
  },
};

let ttTotal = 0;
for (const cls of classRows) {
  const clsSchedule = schedules[cls.name];
  if (!clsSchedule) continue;
  const teacherMap = subjectTeacher[cls.name] || {};
  const timetableRows = [];
  for (const [day, subjects] of Object.entries(clsSchedule)) {
    for (let pi = 0; pi < subjects.length; pi++) {
      const p = PERIODS[pi];
      timetableRows.push({
        class_id: cls.id, day_of_week: day, period: p.period,
        subject: subjects[pi],
        teacher_id: teacherMap[subjects[pi]] ?? teacherMap.default ?? null,
        start_time: p.start, end_time: p.end, term: TERM, academic_year: YEAR,
      });
    }
  }
  const { error } = await supabase.from('timetable')
    .upsert(timetableRows, { onConflict: 'class_id,day_of_week,period,term,academic_year' });
  if (error) warn(`Timetable ${cls.name}: ${error.message}`);
  else ttTotal += timetableRows.length;
}
log(`${ttTotal} timetable slots (3 classes × 5 days × 8 periods)`);

// ── 4. LMS — Courses, Assignments, Materials, Lesson Plans, Submissions ───────
console.log('\n📚 Seeding LMS content...');

const lmsConfig = {
  'Pre-KG': {
    teacherId: t1Id,
    topics: [
      { subject: 'Literacy', title: 'Letter Recognition A–E', description: 'Children learn to identify, trace, and say the sounds for letters A, B, C, D, and E using tactile letter cards, sandpaper letters, and the Montessori alphabet mat. Students trace each letter in a sand tray and identify objects starting with each letter sound.' },
      { subject: 'Numeracy', title: 'Counting 1 to 10 with Objects', description: 'Using the Montessori Number Rods and coloured beads, children count objects from 1 to 10. They learn the number symbols and practice matching quantities to numerals. Songs and movement activities reinforce number recognition.' },
      { subject: 'Phonics', title: 'Initial Sounds — /a/, /b/, /c/', description: 'Introduction to phonemic awareness using the GMS phonics programme. Children clap syllables, identify initial sounds in words, and sort picture cards by their starting sound. The /a/ /b/ /c/ sounds are introduced through songs and rhymes.' },
      { subject: 'Creative Play', title: 'Finger Painting — Seasons & Colours', description: 'Children explore primary colours through finger painting. They mix red and yellow to discover orange, and blue and yellow to make green. The lesson introduces the concept of seasons by painting pictures of rainy day, sunny day, and harmattan.' },
    ],
    assignments: [
      { title: 'Letter Tracing Worksheet A–E', description: 'Complete the letter tracing worksheet. Trace each letter five times using a pencil. Draw one picture that starts with each letter. Bring to class on Monday.', due: futureDate(5), max_score: 10, type: 'homework' },
      { title: 'Count the Objects Activity', description: 'Count the objects on each card (given in class). Circle the correct number. Practice counting to 10 at home using any small objects.', due: futureDate(7), max_score: 10, type: 'classwork' },
    ],
    materials: [
      { title: 'Letter Sounds Alphabet Chart', description: 'A colourful printable alphabet chart with pictures for each letter sound. Display in the classroom or at home.', type: 'link', url: 'https://www.starfall.com/h/abcs/' },
      { title: 'Number Songs — 1 to 10', description: 'Fun number songs playlist for counting practice at home and in class.', type: 'link', url: 'https://www.youtube.com/results?search_query=number+songs+1+to+10+for+kindergarten' },
    ],
    lessonPlan: {
      title: 'Week 3 Lesson Plan — Literacy & Phonics',
      objectives: '1. Students can identify and name letters A–E\n2. Students can produce the sound for each letter\n3. Students can identify objects that start with each sound',
      activities: '• Morning Circle: Alphabet song (5 min)\n• Sandpaper letter tracing A–E (10 min)\n• Picture card sort by initial sound (10 min)\n• Sand tray letter writing (10 min)\n• Closing: Review letter sounds as a group (5 min)',
      materials_needed: 'Sandpaper letters A–E, sand trays, picture cards, alphabet mat, crayons',
      assessment: 'Observation checklist — can the child: (a) name each letter, (b) produce its sound, (c) identify an object starting with it',
      differentiation: 'Advanced: Introduce digraphs (sh, ch). Needs support: Focus only on A, B, C with more tactile practice.',
    },
  },

  'KG 1': {
    teacherId: t2Id,
    topics: [
      { subject: 'Numeracy Skills', title: 'Addition within 10', description: 'Using the Montessori Bead Bar and number tiles, children explore addition by combining two groups of objects and counting the total. The concept of "joining" quantities is reinforced through games: students pick two number cards and find beads to represent each, then count all together.' },
      { subject: 'Literacy Development', title: 'Reading Simple Three-Letter Words', description: 'Children read and decode simple CVC (Consonant-Vowel-Consonant) words: cat, bat, hat, mat, rat, sit, bit, hit. They use the Montessori moveable alphabet to build words from picture cards and read sentences aloud. Emphasis on blending sounds smoothly.' },
      { subject: 'General Science', title: 'Living Things vs Non-Living Things', description: 'Introduction to the concept of life. Children sort picture cards into two groups: things that are alive (plants, animals, people) and non-living things (stones, chairs, books). Key ideas: living things grow, need food, breathe, and reproduce.' },
      { subject: 'Writing Skills', title: 'Pencil Control — Patterns & Shapes', description: 'Exercises to develop fine motor control: tracing zigzag lines, loops, circles, and curves on worksheets. Students also practice drawing lines between two points without lifting the pencil. Correct pencil grip is emphasised throughout.' },
    ],
    assignments: [
      { title: 'Addition Practice Worksheet', description: 'Complete the addition worksheet. Count the pictures in each group, write the numbers, and find the total. Show your working by drawing dots or objects. Due: next Friday.', due: futureDate(7), max_score: 20, type: 'homework' },
      { title: 'Read Aloud — CVC Words', description: 'Practice reading the 10 CVC words on the card sent home. Read each word aloud to a parent or guardian. Ask them to sign the sheet when you have read all 10 words. Return the signed sheet to school.', due: futureDate(4), max_score: 10, type: 'homework' },
    ],
    materials: [
      { title: 'CVC Word Reading Game', description: 'Interactive game for practising consonant-vowel-consonant words. Great for home practice.', type: 'link', url: 'https://www.starfall.com/h/holiday/learn-to-read/' },
      { title: 'KG Science — Living Things Worksheet', description: 'Printable sorting activity: cut out pictures and glue them into the correct column (Living / Non-Living).', type: 'link', url: 'https://www.teacherspayteachers.com/Browse/Search:living+things+nonliving+things+kindergarten+free' },
    ],
    lessonPlan: {
      title: 'Week 4 Lesson Plan — Numeracy & Literacy',
      objectives: '1. Students can add two single-digit numbers with a sum ≤ 10\n2. Students can read and decode 5 CVC words correctly\n3. Students can distinguish living from non-living things',
      activities: '• Morning song & calendar time (5 min)\n• Bead Bar addition activity (10 min)\n• CVC word building with moveable alphabet (10 min)\n• Living/Non-living sorting game (10 min)\n• Story time — "The Very Hungry Caterpillar" (10 min)',
      materials_needed: 'Montessori Bead Bars, moveable alphabet, picture cards, class reader, whiteboard',
      assessment: 'Teacher observation during activity. Addition: can child solve 3 number sentences independently? Reading: can child read 5 CVC words without prompting?',
      differentiation: 'Extension: subtraction within 5. Extra support: use physical objects (counters) for all addition tasks.',
    },
  },

  'Basic 3A': {
    teacherId: t3Id,
    topics: [
      { subject: 'Mathematics', title: 'Multiplication Tables: 3× and 4×', description: 'Students memorise and apply the 3 and 4 times tables. Lesson begins with a skip-counting warm-up on the number line. Students use grid paper to derive each product by repeated addition, then practice with call-and-response drills, snap cards, and a timed written test.' },
      { subject: 'English Language', title: 'Comprehension — "A Day at the Market"', description: 'Students read the passage "A Day at the Market" and answer comprehension questions at literal, inferential, and evaluative levels. Vocabulary work focuses on five new words: bustling, vendor, bargain, aroma, and transaction. Students write a sentence for each new word.' },
      { subject: 'Basic Science', title: 'The Water Cycle', description: 'Lesson covers evaporation, condensation, precipitation, and collection. Students watch a demonstration using a beaker of hot water and a cold plate held above it to show condensation. They label a diagram of the water cycle and write three sentences explaining why rain falls.' },
      { subject: 'Quantitative Reasoning', title: 'Number Patterns and Sequences', description: 'Students identify the rule in a number sequence (add, subtract, multiply, divide) and complete missing terms. Examples include arithmetic sequences (3, 6, 9, ?, 15), geometric sequences (2, 4, 8, ?, 32), and mixed patterns.' },
    ],
    assignments: [
      { title: 'Multiplication Tables Quiz (3× and 4×)', description: 'Write out the full 3 times table and 4 times table in your exercise book. Then solve the 20 multiplication questions on the given sheet. Show all working. Due Monday — this will be collected and marked.', due: futureDate(3), max_score: 20, type: 'homework' },
      { title: 'Water Cycle Diagram — Labelling Exercise', description: 'Draw and label a clear diagram of the water cycle in your science notebook. Include: evaporation, condensation, precipitation, and collection. Add one sentence explaining each process. Colour your diagram neatly.', due: futureDate(6), max_score: 20, type: 'homework' },
      { title: 'Reading Comprehension — "A Day at the Market"', description: 'Answer all 5 comprehension questions in full sentences. Write a new sentence using each of the 5 vocabulary words (bustling, vendor, bargain, aroma, transaction). Maximum 20 marks.', due: futureDate(5), max_score: 20, type: 'classwork' },
    ],
    materials: [
      { title: 'Times Tables Practice — Interactive Game', description: 'Online multiplication drill game for 3× and 4× tables. Play for 10 minutes daily for best results.', type: 'link', url: 'https://www.timestables.com/' },
      { title: 'The Water Cycle — BBC Bitesize', description: 'Short animated video and explanation of the water cycle suitable for Basic 3 level.', type: 'link', url: 'https://www.bbc.co.uk/bitesize/topics/zkcqn39/articles/zwrq7nb' },
      { title: 'English Comprehension Tips', description: 'Guide for answering comprehension questions at full-sentence level. Covers literal, inferential, and evaluative question types.', type: 'link', url: 'https://www.twinkl.co.uk/resources/english-comprehension' },
    ],
    lessonPlan: {
      title: 'Week 5 Lesson Plan — Mathematics & Basic Science',
      objectives: '1. Students can recite and apply the 3× and 4× multiplication tables\n2. Students can label and explain the water cycle\n3. Students can identify patterns in number sequences',
      activities: '• Warm-up: skip counting in 3s and 4s around the class (5 min)\n• Grid paper derivation of times tables (15 min)\n• Call-and-response drill — 3× table (5 min)\n• Water cycle demonstration with beaker & cold plate (15 min)\n• Label the diagram worksheet (10 min)\n• Closing: 5 pattern questions on whiteboard (5 min)',
      materials_needed: 'Grid paper, beaker, hot water (teacher-managed), cold metal plate, water cycle diagram worksheet, multiplication snap cards',
      assessment: 'Timed 20-question multiplication quiz (8 min). Water cycle diagram marked for accuracy (5 labels = 5 marks). Pattern worksheet (5 questions).',
      differentiation: 'Advanced: extend to 6× table. Needs support: use a multiplication chart as reference during practice, focus on 3× only.',
    },
  },
};

let lmsCourseCount = 0, lmsAssignCount = 0, lmsMaterialCount = 0, lmsPlanCount = 0, lmsSubCount = 0;

for (const cls of classRows) {
  const config = lmsConfig[cls.name];
  if (!config) continue;

  for (const topic of config.topics) {
    // Insert course (topic)
    const { data: course, error: cErr } = await supabase.from('courses').insert({
      class_id: cls.id, subject: topic.subject, title: topic.title,
      description: topic.description, teacher_id: config.teacherId,
      term: TERM, academic_year: YEAR, is_active: true,
    }).select('id').single();
    if (cErr) { warn(`Course "${topic.title}": ${cErr.message}`); continue; }
    lmsCourseCount++;

    // Insert assignments for this course (first topic only gets assignments to keep it clean)
    const assignments = config.assignments?.filter((_, i) =>
      config.topics.indexOf(topic) === 0 ? i === 0 : config.topics.indexOf(topic) === 1 ? i === 1 : i === 2
    ) ?? [];
    for (const asn of assignments.slice(0, 1)) {
      const { data: asnRow, error: aErr } = await supabase.from('assignments').insert({
        course_id: course.id, title: asn.title, description: asn.description,
        due_date: asn.due, max_score: asn.max_score, type: asn.type,
        created_by: config.teacherId ?? adminId,
      }).select('id').single();
      if (aErr) { warn(`Assignment: ${aErr.message}`); continue; }
      lmsAssignCount++;

      // Add 2 student submissions for the first student in the class
      const students = studentsByClass[cls.name] || [];
      const submissionStudents = students.slice(0, 2);
      for (const [si, student] of submissionStudents.entries()) {
        const score = si === 0 ? asn.max_score : Math.round(asn.max_score * 0.75);
        const { error: subErr } = await supabase.from('submissions').insert({
          assignment_id: asnRow.id, student_id: student.id,
          content: si === 0
            ? `I have completed the task carefully and checked my work. All questions answered to the best of my ability.`
            : `Completed the assignment. Some parts were challenging but I tried my best.`,
          status: 'graded', score, feedback: si === 0 ? 'Excellent work! Well done.' : 'Good effort. Review the parts you found difficult.',
          graded_by: config.teacherId ?? adminId,
          submitted_at: new Date(Date.now() - 86400000 * (3 - si)).toISOString(),
          graded_at: new Date(Date.now() - 86400000 * (1 - si * 0.5)).toISOString(),
        });
        if (subErr) warn(`Submission: ${subErr.message}`);
        else lmsSubCount++;
      }
    }

    // Materials (first topic in each class gets materials)
    if (config.topics.indexOf(topic) === 0 && config.materials?.length) {
      for (const mat of config.materials) {
        const { error: matErr } = await supabase.from('course_materials').insert({
          course_id: course.id, title: mat.title, description: mat.description,
          type: mat.type, url: mat.url, uploaded_by: config.teacherId ?? adminId,
        });
        if (matErr) warn(`Material: ${matErr.message}`);
        else lmsMaterialCount++;
      }
    }

    // Lesson plan (first topic per class gets a lesson plan)
    if (config.topics.indexOf(topic) === 0 && config.lessonPlan) {
      const lp = config.lessonPlan;
      const { error: lpErr } = await supabase.from('lesson_plans').insert({
        course_id: course.id, teacher_profile_id: config.teacherId ?? adminId,
        title: lp.title, objectives: lp.objectives, activities: lp.activities,
        materials_needed: lp.materials_needed, assessment: lp.assessment,
        differentiation: lp.differentiation,
        lesson_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        status: 'approved',
        reviewed_by: adminId,
        review_note: 'Well structured plan. Clear objectives and appropriate differentiation strategies.',
        reviewed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      });
      if (lpErr) warn(`Lesson plan: ${lpErr.message}`);
      else lmsPlanCount++;
    }
  }
}
log(`LMS: ${lmsCourseCount} topics, ${lmsAssignCount} assignments, ${lmsMaterialCount} materials, ${lmsPlanCount} lesson plans, ${lmsSubCount} submissions`);

// ── 5. FEES — all classes ─────────────────────────────────────────────────────
console.log('\n💰 Seeding fees...');

const feeTemplates = [
  { fee_type: 'Tuition Fee',       amount: 95000,  due: '2026-01-15', status_by_idx: ['paid','paid','partial','paid','overdue'] },
  { fee_type: 'Development Levy',  amount: 15000,  due: '2026-01-15', status_by_idx: ['paid','paid','paid','paid','pending']   },
  { fee_type: 'PTA Dues',          amount: 5000,   due: '2026-01-20', status_by_idx: ['paid','paid','paid','paid','paid']      },
  { fee_type: 'Exam Fee',          amount: 8000,   due: '2026-02-01', status_by_idx: ['paid','paid','pending','paid','pending']},
  { fee_type: 'Uniform & Books',   amount: 22000,  due: '2026-01-10', status_by_idx: ['paid','paid','paid','partial','paid']   },
];

// First clear existing demo fees for all classes
const allStudentIds = (allStudents||[]).map(s => s.id);
await supabase.from('fees').delete().in('student_id', allStudentIds).eq('term', TERM).eq('academic_year', YEAR);

const feeRows = [];
for (const cls of classRows) {
  const students = studentsByClass[cls.name] || [];
  for (const tmpl of feeTemplates) {
    for (let si = 0; si < students.length; si++) {
      const s = tmpl.status_by_idx[si] || 'pending';
      const paidAmt = s === 'paid' ? tmpl.amount : s === 'partial' ? Math.round(tmpl.amount * 0.5) : 0;
      feeRows.push({
        student_id: students[si].id, fee_type: tmpl.fee_type, amount: tmpl.amount,
        due_date: tmpl.due, paid_amount: paidAmt, status: s, term: TERM, academic_year: YEAR,
      });
    }
  }
}
const { error: feeErr } = await supabase.from('fees').insert(feeRows);
if (feeErr) fail(`Fees: ${feeErr.message}`);
else log(`${feeRows.length} fee records (${feeTemplates.length} types × ${allStudents?.length ?? 0} students)`);

// ── 6. HEALTH RECORDS ─────────────────────────────────────────────────────────
console.log('\n🏥 Seeding health records...');
await supabase.from('health_records').delete().in('student_id', allStudentIds);

const healthTemplates = [
  [
    { type: 'Medical Check-up', desc: 'Routine examination. Student is in excellent health. Vision 20/20. No concerns noted.', date: '2026-01-08' },
    { type: 'Vaccination', desc: 'Yellow Fever booster administered. No adverse reactions.', date: '2026-01-15' },
  ],
  [
    { type: 'Medical Check-up', desc: 'Healthy. Recommended daily iron supplement — advised parents.', date: '2026-01-08' },
    { type: 'Allergy Record', desc: 'Mild dust allergy. Antihistamine kept in school first-aid box.', date: '2026-01-20' },
  ],
  [
    { type: 'Medical Check-up', desc: 'Slightly underweight. Parents advised on nutrition and balanced diet.', date: '2026-01-09' },
    { type: 'Sick Visit', desc: 'Mild fever 37.8°C on 26 Jan. Parents contacted; student sent home.', date: '2026-01-26' },
    { type: 'Follow-up', desc: 'Fully recovered. Normal temperature. Returned to class.', date: '2026-01-28' },
  ],
  [
    { type: 'Medical Check-up', desc: 'Excellent health. All metrics normal. No medical conditions.', date: '2026-01-08' },
    { type: 'Vaccination', desc: 'Hepatitis B booster administered successfully.', date: '2026-01-15' },
  ],
  [
    { type: 'Medical Check-up', desc: 'Student has mild pre-existing asthma. Reliever inhaler kept in school office.', date: '2026-01-09' },
    { type: 'Sick Visit', desc: 'Mild asthmatic episode (3 Feb). Reliever inhaler given. Recovered in 20 min. Parents notified.', date: '2026-02-03' },
    { type: 'Allergy Record', desc: 'Allergies: peanuts, dust. Emergency contact: parent phone on file.', date: '2026-01-09' },
  ],
];

const healthRows = [];
for (const cls of classRows) {
  const students = studentsByClass[cls.name] || [];
  for (let si = 0; si < students.length; si++) {
    const records = healthTemplates[si] || healthTemplates[0];
    for (const r of records) {
      healthRows.push({ student_id: students[si].id, record_type: r.type, description: r.desc, date_recorded: r.date, recorded_by: adminId });
    }
  }
}
const { error: healthErr } = await supabase.from('health_records').insert(healthRows);
if (healthErr) fail(`Health: ${healthErr.message}`);
else log(`${healthRows.length} health records (${classRows.length} classes)`);

// ── 7. ANNOUNCEMENTS ──────────────────────────────────────────────────────────
console.log('\n📣 Seeding announcements...');

// Clear prior
const demoAnnounceTitles = [
  'First Term Examination Schedule — 2025/2026',
  'End-of-Term Prize Giving Day — 7th March 2026',
  'School Fees Reminder — Second Term 2025/2026',
  'Mid-Term Break — 10th to 14th February 2026',
  'Staff Meeting — Friday 27th February 2026',
  'Interhouse Sports Competition — 21st February 2026',
];
await supabase.from('announcements').delete().in('title', demoAnnounceTitles).eq('published_by', adminId);

const announcements = [
  {
    title: 'First Term Examination Schedule — 2025/2026',
    content: `Dear Parents and Students,\n\nThe First Term Examinations for the 2025/2026 Academic Year will commence on Monday, 24th February 2026 and end on Friday, 28th February 2026.\n\nAll students are expected to:\n• Arrive at school by 7:45 AM on exam days\n• Come with writing materials (2 pens, pencil, ruler)\n• Study all topics covered this term\n\nExamination timetables will be distributed in class. Please ensure your ward is adequately prepared.\n\nThank you for your continued support.\n\nThe Management\nGreenville Montessori Schools`,
    target_audience: ['all'], priority: 'urgent', published: true,
    expires_at: new Date('2026-03-07').toISOString(),
  },
  {
    title: 'End-of-Term Prize Giving Day — 7th March 2026',
    content: `We are delighted to invite parents and guardians to our End-of-Term Prize Giving & Graduation Ceremony.\n\n📅 Date: Saturday, 7th March 2026\n⏰ Time: 10:00 AM\n📍 Venue: School Assembly Hall\n\nThis event celebrates outstanding students and marks the close of the First Term. Best students in each class will be recognised and awarded.\n\nDress Code: Smart casual. Students in full school uniform.\n\nKindly confirm attendance with the school office by 3rd March 2026.`,
    target_audience: ['parent', 'all'], priority: 'high', published: true,
    expires_at: new Date('2026-03-08').toISOString(),
  },
  {
    title: 'School Fees Reminder — Second Term 2025/2026',
    content: `This is a reminder that Second Term school fees are due by 15th April 2026.\n\nFees can be paid:\n• In person at the bursary (Mon–Fri, 8am–3pm)\n• Via bank transfer (account details available from the school office)\n\nStudents whose fees are not settled by the deadline may be unable to resume for Second Term.\n\nPlease contact the school office if you require a payment plan. We are happy to assist.\n\nThank you for your prompt attention.`,
    target_audience: ['parent'], priority: 'normal', published: true,
    expires_at: new Date('2026-04-20').toISOString(),
  },
  {
    title: 'Mid-Term Break — 10th to 14th February 2026',
    content: `Please be informed that school will be on mid-term break from Monday, 10th February to Friday, 14th February 2026.\n\nResumption: Monday, 17th February 2026.\n\nStudents are encouraged to use the break productively — reading, revision, and family time.\n\nHave a restful and enjoyable break!`,
    target_audience: ['all'], priority: 'normal', published: true,
    expires_at: new Date('2026-02-17').toISOString(),
  },
  {
    title: 'Staff Meeting — Friday 27th February 2026',
    content: `All teaching and non-teaching staff are reminded of the mandatory end-of-term staff meeting:\n\n📅 Date: Friday, 27th February 2026\n⏰ Time: 2:30 PM (after student dismissal)\n📍 Venue: Staff Room\n\nAgenda:\n1. First Term review and student performance analysis\n2. Second Term academic planning\n3. Extracurricular activities update\n4. Any other business\n\nAttendance is compulsory. Come prepared with class registers and term reports.`,
    target_audience: ['teacher'], priority: 'high', published: true,
    expires_at: new Date('2026-02-28').toISOString(),
  },
  {
    title: 'Interhouse Sports Competition — 21st February 2026',
    content: `The Annual Interhouse Sports Competition is scheduled for:\n\n📅 Date: Saturday, 21st February 2026\n⏰ Time: 9:00 AM\n📍 Venue: School Sports Ground\n\nEvents:\n• 100m, 200m, and 400m sprint\n• Long jump & high jump\n• Relay races\n• Tug of war\n\nStudents should come in their house colours. Parents are warmly invited to cheer on our young athletes!\n\nRefreshments will be available.`,
    target_audience: ['all'], priority: 'normal', published: true,
    expires_at: new Date('2026-02-22').toISOString(),
  },
];

const { error: annErr } = await supabase.from('announcements').insert(
  announcements.map(a => ({ ...a, published_by: adminId }))
);
if (annErr) fail(`Announcements: ${annErr.message}`);
else log(`${announcements.length} announcements published`);

// ── 8. MESSAGES ───────────────────────────────────────────────────────────────
console.log('\n💬 Seeding messages...');

const demoMsgSubjects = [
  'Welcome to the First Term 2025/2026 — GMS Portal',
  'Staff Briefing — First Term Academic Calendar 2025/2026',
  'Basic 3A Class Performance — Mid Term Review',
  'Re: Basic 3A Class Performance — Mid Term Review',
  'KG 1 Literacy Progress — First Term Update',
  'Pre-KG Morning Routine — Parent Guidance',
];
await supabase.from('messages').delete().in('subject', demoMsgSubjects);

const messageRows = [
  {
    sender_id: adminId, recipient_id: null, target_role: 'parent',
    subject: 'Welcome to the First Term 2025/2026 — GMS Portal',
    body: `Dear Parents and Guardians,\n\nWelcome to the First Term of the 2025/2026 Academic Year! We are delighted to have your children back at Greenville Montessori Schools.\n\nYou can now use the Parent Portal to:\n✔ View your child's grades and result cards\n✔ Monitor daily attendance\n✔ Check the class timetable\n✔ Track fee payments\n✔ Read school announcements\n✔ Message your child's teacher directly\n\nIf you need help accessing the portal, please contact our office.\n\nWith warm regards,\nThe Management\nGreenville Montessori Schools`,
    is_read: false,
  },
  {
    sender_id: adminId, recipient_id: null, target_role: 'teacher',
    subject: 'Staff Briefing — First Term Academic Calendar 2025/2026',
    body: `Dear Staff,\n\nKey dates for First Term 2025/2026:\n\n• Fees deadline: 15th January 2026\n• Mid-term break: 10th–14th February 2026\n• Examinations: 24th–28th February 2026\n• Prize Giving Day: 7th March 2026\n• School closes: 7th March 2026\n• Second Term resumes: 28th April 2026\n\nPlease submit lesson plans on the portal by the last Friday of each month and upload all CA scores before the exam week.\n\nThank you for your dedication and hard work.\n\nThe Management`,
    is_read: false,
  },
];

if (t1Id) {
  messageRows.push({
    sender_id: adminId, recipient_id: t1Id, target_role: null,
    subject: 'Basic 3A Class Performance — Mid Term Review',
    body: `Dear Mrs. Adaeze,\n\nI have reviewed the mid-term academic performance for Basic 3A. Overall the class is performing commendably.\n\nNotable observations:\n• Chidera Nwosu continues to excel across all subjects — consistently top of class.\n• Fatima Bello has shown great improvement in Mathematics this term.\n• Emmanuel Obi needs additional support. Please schedule a parent-teacher meeting at your earliest convenience.\n\nPlease ensure all CA scores are uploaded to the portal before the examination week. Also, your lesson plan for Week 5 is pending review — please submit it through the LMS.\n\nThank you for the excellent work you're doing with the class.\n\nBest regards,\nThe Principal`,
    is_read: false,
  });
  messageRows.push({
    sender_id: t1Id, recipient_id: adminId, target_role: null,
    subject: 'Re: Basic 3A Class Performance — Mid Term Review',
    body: `Dear Principal,\n\nThank you for the feedback. I agree with the assessment.\n\nRegarding Emmanuel Obi, I have already spoken informally with the parents. They have agreed to arrange extra lessons and are monitoring his progress at home. I will schedule a formal parent-teacher meeting this week.\n\nAll CA scores will be uploaded to the portal by Friday afternoon. The Week 5 lesson plan has now been submitted on the LMS for your review.\n\nBest regards,\nMrs. Adaeze Okonkwo\nClass Teacher — Basic 3A`,
    is_read: true,
  });
}

if (t2Id) {
  messageRows.push({
    sender_id: t2Id, recipient_id: adminId, target_role: null,
    subject: 'KG 1 Literacy Progress — First Term Update',
    body: `Dear Principal,\n\nI am pleased to report on the literacy progress of KG 1 for the First Term.\n\nThe class as a whole has made good progress in CVC word reading. Kelechi Eze and Amina Bello are reading simple sentences fluently. Chinonso Okafor is showing strong improvement.\n\nI will be introducing short vowel digraphs next week.\n\nKind regards,\nMr. Emeka Eze\nClass Teacher — KG 1`,
    is_read: true,
  });
}

messageRows.push({
  sender_id: adminId, recipient_id: null, target_role: 'parent',
  subject: 'Pre-KG Morning Routine — Parent Guidance',
  body: `Dear Parents of Pre-KG students,\n\nThank you for your support with your child's morning routine. A smooth drop-off helps children settle quickly and learn better.\n\nPlease ensure your child:\n• Arrives by 7:45 AM\n• Has eaten breakfast before school\n• Has their school bag packed with their reading folder, water bottle, and snack\n• Says a warm goodbye at the gate (brief goodbyes help children transition more easily)\n\nIf your child shows signs of separation anxiety, please speak with Mrs. Adaeze — we have strategies to help.\n\nThank you for partnering with us.\n\nThe Management`,
  is_read: false,
});

const { error: msgErr } = await supabase.from('messages').insert(messageRows);
if (msgErr) fail(`Messages: ${msgErr.message}`);
else log(`${messageRows.length} messages created`);

// ═════════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n✅ Presentation demo seed complete!\n');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  MODULE             RECORDS');
console.log('───────────────────────────────────────────────────────────────────');
console.log(`  Parents            6 accounts (2 per class, linked to students)`);
console.log(`  Attendance         ${attendanceRows.length} records  (3 classes × ${schoolDays.length} school days)`);
console.log(`  Timetables         ${ttTotal} slots  (3 classes × 5 days × 8 periods)`);
console.log(`  LMS Topics         ${lmsCourseCount} courses`);
console.log(`  LMS Assignments    ${lmsAssignCount} assignments`);
console.log(`  LMS Materials      ${lmsMaterialCount} resources`);
console.log(`  LMS Lesson Plans   ${lmsPlanCount} plans (status: approved)`);
console.log(`  LMS Submissions    ${lmsSubCount} student submissions (graded)`);
console.log(`  Fees               ${feeRows.length} records  (5 fee types)`);
console.log(`  Health Records     ${healthRows.length} records`);
console.log(`  Announcements      ${announcements.length} published`);
console.log(`  Messages           ${messageRows.length} messages`);
console.log('═══════════════════════════════════════════════════════════════════');
console.log('\n  LOGIN CREDENTIALS\n');
console.log('  ADMIN');
console.log('  admin@greenvillemontessorischools.ng          Admin123!');
console.log('\n  TEACHERS');
console.log('  teacher.adaeze@greenvillemontessorischools.ng  Teacher123!  (Pre-KG — Mathematics & Basic Science)');
console.log('  teacher.emeka@greenvillemontessorischools.ng   Teacher123!  (KG 1 — English & Social Studies)');
console.log('  teacher.ifeoma@greenvillemontessorischools.ng  Teacher123!  (Basic 3A — Class Teacher)');
console.log('\n  STUDENTS — Pre-KG (password: Student123!)');
console.log('  zara.eze@greenvillemontessorischools.ng');
console.log('  kene.chukwu@greenvillemontessorischools.ng');
console.log('\n  STUDENTS — KG 1 (password: Student123!)');
console.log('  kelechi.eze@greenvillemontessorischools.ng');
console.log('  chinonso.okafor@greenvillemontessorischools.ng');
console.log('\n  STUDENTS — Basic 3A (password: Student123!)');
console.log('  chidera.nwosu@greenvillemontessorischools.ng');
console.log('  amaka.okafor@greenvillemontessorischools.ng');
console.log('\n  PARENTS (password: Parent123!)');
console.log('  parent.ngozi.eze@greenvillemontessorischools.ng         (Pre-KG parent)');
console.log('  parent.chukwuemeka.chukwu@greenvillemontessorischools.ng (Pre-KG parent)');
console.log('  parent.adaobi.eze@greenvillemontessorischools.ng        (KG 1 parent)');
console.log('  parent.uchenna.okafor@greenvillemontessorischools.ng    (KG 1 parent)');
console.log('  parent.bola.nwosu@greenvillemontessorischools.ng        (Basic 3A parent)');
console.log('  parent.segun.adeyemi@greenvillemontessorischools.ng     (Basic 3A parent)');
console.log('\n  TO REMOVE ALL DEMO DATA AFTER YOUR PRESENTATION:');
console.log('  node scripts/seed-presentation-demo.mjs --clear');
console.log('═══════════════════════════════════════════════════════════════════\n');

process.exit(0);
