/**
 * Full demo seed: attendance, timetable, announcements, fees, health records, transport, messages
 * Run after seed-demo-data.mjs, or: npm run seed:full
 *
 * Loads repo `.env` via load-root-env.
 */
import './load-root-env.mjs';
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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TERM = 'First Term';
const YEAR = '2025/2026';

function log(msg)  { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.warn(`  ⚠ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── Sign in ───────────────────────────────────────────────────────────────────
console.log('\n🔑 Signing in as admin...');
const { error: signInErr } = await supabase.auth.signInWithPassword({
  email: 'admin@greenvillemontessorischools.ng', password: 'Admin123!',
});
if (signInErr) { fail(signInErr.message); process.exit(1); }

const { data: { user } } = await supabase.auth.getUser();
const { data: adminProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
const adminId = adminProfile.id;
log('Signed in');

// ── Fetch existing demo data ───────────────────────────────────────────────────
console.log('\n📥 Loading existing demo data...');

const { data: classRows } = await supabase
  .from('classes')
  .select('id, name')
  .eq('name', 'Basic 3A')
  .eq('academic_year', YEAR)
  .order('created_at', { ascending: true })
  .limit(1);

const classRow = classRows?.[0] ?? null;

const { data: students } = classRow
  ? await supabase
      .from('students')
      .select('id, student_id, profiles:profile_id(id, first_name, last_name)')
      .eq('class_id', classRow.id)
      .order('student_id')
  : { data: null };

const { data: allDemoTeachers } = await supabase
  .from('profiles')
  .select('id, first_name, last_name')
  .like('email', 'teacher.%@greenvillemontessorischools.ng');

let teachers = [];
if (allDemoTeachers?.length) {
  const profileIds = allDemoTeachers.map((p) => p.id);
  const { data: t } = await supabase
    .from('teachers')
    .select('id, profile_id, employee_id, profiles:profile_id(first_name, last_name, id)')
    .in('profile_id', profileIds);
  teachers = (t || []).sort((a, b) => (a.employee_id || '').localeCompare(b.employee_id || ''));
}

if (!students?.length || !classRow) {
  fail('Demo students or class not found. Run seed-demo-data.mjs first.');
  process.exit(1);
}

if (students.length < 5) {
  fail(
    `Need at least 5 students in ${classRow.name}; found ${students.length}. Re-run: npm run seed:full (seed-demo-data will repair rows).`,
  );
  process.exit(1);
}

log(`Found ${students.length} students in ${classRow.name}`);
log(`Found ${teachers.length} teachers`);

const t1 = teachers[0];
const t2 = teachers[1] || teachers[0];
const teacher1ProfileId = t1?.profiles?.id ?? t1?.profile_id ?? null;

// Re-seed safe: remove rows this script inserted last time (same titles / class students).
console.log('\n🧹 Clearing prior full-demo rows for this class...');
const studentIdList = students.map((s) => s.id);
await supabase
  .from('fees')
  .delete()
  .in('student_id', studentIdList)
  .eq('term', TERM)
  .eq('academic_year', YEAR);
await supabase.from('health_records').delete().in('student_id', studentIdList);
await supabase.from('transport').delete().in('student_id', studentIdList);

const demoAnnouncementTitles = [
  'First Term Examination Schedule — 2025/2026',
  'End-of-Term Prize Giving Day — 7th March 2026',
  'School Fees Reminder — Second Term',
  'Mid-Term Break — 10th to 14th February 2026',
  'Staff Meeting — Friday 27th February',
  'Interhouse Sports — 21st February 2026',
];
await supabase.from('announcements').delete().in('title', demoAnnouncementTitles).eq('published_by', adminId);

const adminDemoMessageSubjects = [
  'Welcome to the First Term 2025/2026',
  'Staff Briefing — First Term Academic Calendar',
  'Basic 3A Class Performance — Mid Term Review',
];
await supabase.from('messages').delete().in('subject', adminDemoMessageSubjects).eq('sender_id', adminId);
const teacherReplySubjects = ['Re: Basic 3A Class Performance — Mid Term Review'];
if (teacher1ProfileId) {
  await supabase.from('messages').delete().in('subject', teacherReplySubjects).eq('sender_id', teacher1ProfileId);
}
log('Cleanup done');

// ── 1. ATTENDANCE — last 4 weeks (Mon–Fri) ────────────────────────────────────
console.log('\n📅 Seeding attendance (4 weeks)...');

// Build list of school days in the last 4 weeks (excluding weekends)
function schoolDaysBack(weeks) {
  const days = [];
  const today = new Date();
  for (let d = 1; d <= weeks * 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dow = date.getDay();
    if (dow >= 1 && dow <= 5) days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

const schoolDays = schoolDaysBack(4);
log(`${schoolDays.length} school days to seed`);

const attendanceRows = [];
for (const student of students) {
  const si = students.indexOf(student);
  for (const day of schoolDays) {
    // Attendance pattern varies by student — top students rarely absent
    let status = 'present';
    const roll = Math.random();
    if (si === 4 && roll < 0.2) status = 'absent';       // Emmanuel — absent 20%
    else if (si === 2 && roll < 0.12) status = 'absent';  // Tobi — absent 12%
    else if (si === 0 && roll < 0.03) status = 'late';    // Chidera — rarely late
    else if (roll < 0.05) status = 'late';                // Others — 5% late
    else if (roll < 0.07) status = 'absent';              // Others — 7% absent

    attendanceRows.push({
      student_id: student.id,
      date: day,
      status,
      marked_by: adminId,
      notes: status === 'absent' ? 'Parent notified' : null,
    });
  }
}

// Insert in chunks of 100 to avoid payload limits
for (let i = 0; i < attendanceRows.length; i += 100) {
  const chunk = attendanceRows.slice(i, i + 100);
  const { error } = await supabase.from('attendance').upsert(chunk, { onConflict: 'student_id,date' });
  if (error) fail(`Attendance chunk: ${error.message}`);
}
log(`${attendanceRows.length} attendance records created`);

// ── 2. TIMETABLE — full week for Basic 3A ─────────────────────────────────────
console.log('\n🕐 Seeding timetable...');

const periods = [
  { period: 1, start: '08:00', end: '08:40' },
  { period: 2, start: '08:40', end: '09:20' },
  { period: 3, start: '09:20', end: '10:00' },
  // Break 10:00–10:20
  { period: 4, start: '10:20', end: '11:00' },
  { period: 5, start: '11:00', end: '11:40' },
  { period: 6, start: '11:40', end: '12:20' },
  // Lunch 12:20–13:00
  { period: 7, start: '13:00', end: '13:40' },
  { period: 8, start: '13:40', end: '14:20' },
];

// Mon Tue Wed Thu Fri × 8 periods
const schedule = {
  Monday:    ['Mathematics', 'English Language', 'Basic Science', 'Social Studies',    'Mathematics',      'Christian R. K.',        'Quantitative Reasoning', 'Physical Education'],
  Tuesday:   ['English Language', 'Mathematics', 'Social Studies', 'Basic Science',   'English Language', 'Quantitative Reasoning',  'Mathematics',            'Creative Arts'],
  Wednesday: ['Basic Science', 'Quantitative Reasoning', 'Mathematics', 'English Language', 'Social Studies', 'Mathematics',         'English Language',        'Computer Studies'],
  Thursday:  ['Social Studies', 'English Language', 'Christian R. K.', 'Mathematics', 'Quantitative Reasoning', 'Basic Science',    'English Language',        'Agricultural Science'],
  Friday:    ['Quantitative Reasoning', 'Basic Science', 'English Language', 'Mathematics', 'Christian R. K.', 'Social Studies',   'Assembly / Moral Edu',    'Library / Reading'],
};

// Which teacher covers which subject
const subjectTeacher = {
  'Mathematics':              t1?.id ?? null,
  'Quantitative Reasoning':   t1?.id ?? null,
  'Basic Science':            t1?.id ?? null,
  'English Language':         t2?.id ?? null,
  'Social Studies':           t2?.id ?? null,
  'Christian R. K.':          t2?.id ?? null,
  'Physical Education':       null,
  'Creative Arts':            null,
  'Computer Studies':         null,
  'Agricultural Science':     null,
  'Assembly / Moral Edu':     null,
  'Library / Reading':        null,
};

const timetableRows = [];
for (const [day, subjects] of Object.entries(schedule)) {
  for (let pi = 0; pi < subjects.length; pi++) {
    const p = periods[pi];
    timetableRows.push({
      class_id: classRow.id,
      day_of_week: day,
      period: p.period,
      subject: subjects[pi],
      teacher_id: subjectTeacher[subjects[pi]] ?? null,
      start_time: p.start,
      end_time: p.end,
      term: TERM,
      academic_year: YEAR,
    });
  }
}

const { error: ttErr } = await supabase.from('timetable')
  .upsert(timetableRows, { onConflict: 'class_id,day_of_week,period,term,academic_year' });
if (ttErr) fail(`Timetable: ${ttErr.message}`);
else log(`${timetableRows.length} timetable slots created (5 days × 8 periods)`);

// ── 3. ANNOUNCEMENTS ──────────────────────────────────────────────────────────
console.log('\n📣 Seeding announcements...');

const announcements = [
  {
    title: 'First Term Examination Schedule — 2025/2026',
    content: `Dear Parents and Students,\n\nThe First Term Examinations for the 2025/2026 Academic Year will commence on Monday, 24th February 2026 and end on Friday, 28th February 2026.\n\nAll students are expected to:\n• Arrive at school by 7:45 AM on exam days\n• Come with their writing materials (2 pens, pencil, ruler)\n• Study all topics covered this term\n\nTime table will be distributed in class. Please ensure your ward is adequately prepared.\n\nThank you for your continued support.\n\nThe Management`,
    target_audience: ['all'],
    priority: 'urgent',
    published: true,
    expires_at: new Date('2026-03-07').toISOString(),
  },
  {
    title: 'End-of-Term Prize Giving Day — 7th March 2026',
    content: `We are delighted to invite parents and guardians to our End-of-Term Prize Giving & Graduation Ceremony.\n\n📅 Date: Saturday, 7th March 2026\n⏰ Time: 10:00 AM\n📍 Venue: School Assembly Hall\n\nThis event celebrates our outstanding students and marks the close of the First Term. Best students in each class will be recognised and awarded.\n\nDress Code: Smart casual. School uniform for students.\n\nKindly confirm attendance with the school office by 3rd March 2026.`,
    target_audience: ['parent', 'all'],
    priority: 'high',
    published: true,
    expires_at: new Date('2026-03-08').toISOString(),
  },
  {
    title: 'School Fees Reminder — Second Term',
    content: `This is a reminder that Second Term school fees are due by 15th April 2026.\n\nFees can be paid:\n• In person at the bursary (Mon–Fri, 8am–3pm)\n• Via bank transfer (account details on the invoice)\n\nStudents whose fees are not paid by the deadline may be unable to resume for Second Term. Please contact the school office if you require a payment plan.\n\nThank you for your prompt attention.`,
    target_audience: ['parent'],
    priority: 'normal',
    published: true,
    expires_at: new Date('2026-04-20').toISOString(),
  },
  {
    title: 'Mid-Term Break — 10th to 14th February 2026',
    content: `Please be informed that school will be on mid-term break from Monday, 10th February to Friday, 14th February 2026.\n\nResumption is Monday, 17th February 2026.\n\nStudents are encouraged to use the break productively — reading, revision, and family time.\n\nHave a restful break!`,
    target_audience: ['all'],
    priority: 'normal',
    published: true,
    expires_at: new Date('2026-02-17').toISOString(),
  },
  {
    title: 'Staff Meeting — Friday 27th February',
    content: `All teaching and non-teaching staff are reminded of the mandatory end-of-term staff meeting:\n\n📅 Date: Friday, 27th February 2026\n⏰ Time: 2:30 PM (after dismissal)\n📍 Venue: Staff Room\n\nAgenda:\n1. Term review and student performance analysis\n2. Second term planning\n3. Extracurricular activities update\n4. Any other business\n\nAttendance is compulsory. Please come prepared with your class registers and term reports.`,
    target_audience: ['teacher'],
    priority: 'high',
    published: true,
    expires_at: new Date('2026-02-28').toISOString(),
  },
  {
    title: 'Interhouse Sports — 21st February 2026',
    content: `The Annual Interhouse Sports Competition is scheduled for:\n\n📅 Date: Saturday, 21st February 2026\n⏰ Time: 9:00 AM\n📍 Venue: School Sports Ground\n\nEvents:\n• 100m, 200m and 400m sprint\n• Long jump & high jump\n• Relay races\n• Tug of war\n\nStudents should come in their house colours. Parents are warmly invited to cheer on our young athletes!\n\nRefreshments will be available.`,
    target_audience: ['all'],
    priority: 'normal',
    published: true,
    expires_at: new Date('2026-02-22').toISOString(),
  },
];

const { error: annErr } = await supabase.from('announcements').insert(
  announcements.map(a => ({ ...a, published_by: adminId }))
);
if (annErr) fail(`Announcements: ${annErr.message}`);
else log(`${announcements.length} announcements published`);

// ── 4. FEES ───────────────────────────────────────────────────────────────────
console.log('\n💰 Seeding fees...');

const feeTemplates = [
  { fee_type: 'Tuition Fee',       amount: 95000,  due: '2026-01-15', status_by_student: ['paid', 'paid', 'partial', 'paid', 'overdue'] },
  { fee_type: 'Development Levy',  amount: 15000,  due: '2026-01-15', status_by_student: ['paid', 'paid', 'paid',    'paid', 'pending'] },
  { fee_type: 'PTA Dues',          amount: 5000,   due: '2026-01-20', status_by_student: ['paid', 'paid', 'paid',    'paid', 'paid']    },
  { fee_type: 'Exam Fee',          amount: 8000,   due: '2026-02-01', status_by_student: ['paid', 'paid', 'pending', 'paid', 'pending'] },
  { fee_type: 'Uniform & Books',   amount: 22000,  due: '2026-01-10', status_by_student: ['paid', 'paid', 'paid',    'partial','paid']  },
];

const feeRows = [];
for (const tmpl of feeTemplates) {
  for (let si = 0; si < students.length; si++) {
    const s = tmpl.status_by_student[si] || 'pending';
    const paidAmt = s === 'paid' ? tmpl.amount : s === 'partial' ? Math.round(tmpl.amount * 0.5) : 0;
    feeRows.push({
      student_id: students[si].id,
      fee_type: tmpl.fee_type,
      amount: tmpl.amount,
      due_date: tmpl.due,
      paid_amount: paidAmt,
      status: s,
      term: TERM,
      academic_year: YEAR,
    });
  }
}

const { error: feeErr } = await supabase.from('fees').insert(feeRows);
if (feeErr) fail(`Fees: ${feeErr.message}`);
else log(`${feeRows.length} fee records created (${feeTemplates.length} fee types × ${students.length} students)`);

// ── 5. HEALTH RECORDS ─────────────────────────────────────────────────────────
console.log('\n🏥 Seeding health records...');

const healthData = [
  { si: 0, records: [
    { type: 'Medical Check-up', desc: 'Routine medical examination. Student is in excellent health. Vision: 20/20. No concerns.', date: '2026-01-08' },
    { type: 'Vaccination', desc: 'Administered Yellow Fever booster vaccine. No adverse reactions observed.', date: '2026-01-15' },
  ]},
  { si: 1, records: [
    { type: 'Medical Check-up', desc: 'Routine check-up completed. Student is healthy. Recommended iron supplements.', date: '2026-01-08' },
    { type: 'Allergy Record', desc: 'Student has mild dust allergy. Prescribed antihistamine to be kept in school first aid box.', date: '2026-01-20' },
  ]},
  { si: 2, records: [
    { type: 'Medical Check-up', desc: 'Routine check-up. Slight underweight noted. Parents advised on nutrition.', date: '2026-01-09' },
    { type: 'Sick Visit', desc: 'Student reported mild fever and headache (26 Jan). Temperature: 37.8°C. Parents contacted. Sent home to rest.', date: '2026-01-26' },
    { type: 'Follow-up', desc: 'Student returned to school. Fully recovered. Normal temperature recorded.', date: '2026-01-28' },
  ]},
  { si: 3, records: [
    { type: 'Medical Check-up', desc: 'Excellent health. No medical conditions. Vision and hearing within normal range.', date: '2026-01-08' },
    { type: 'Vaccination', desc: 'Hepatitis B booster administered. Student tolerated well.', date: '2026-01-15' },
  ]},
  { si: 4, records: [
    { type: 'Medical Check-up', desc: 'Student has mild asthma (pre-existing). Inhaler kept in school office. Parents informed to renew prescription.', date: '2026-01-09' },
    { type: 'Sick Visit', desc: 'Mild asthmatic episode (3 Feb). Administered reliever inhaler. Recovered within 20 minutes. Parents notified.', date: '2026-02-03' },
    { type: 'Allergy Record', desc: 'Known allergies: peanuts, dust. Emergency contact: Mrs. Ngozi Obi — 08012345678. Epinephrine auto-injector in office.', date: '2026-01-09' },
  ]},
];

const healthRows = [];
for (const { si, records } of healthData) {
  for (const r of records) {
    healthRows.push({
      student_id: students[si].id,
      record_type: r.type,
      description: r.desc,
      date_recorded: r.date,
      recorded_by: adminId,
    });
  }
}

const { error: healthErr } = await supabase.from('health_records').insert(healthRows);
if (healthErr) fail(`Health records: ${healthErr.message}`);
else log(`${healthRows.length} health records created`);

// ── 6. TRANSPORT ──────────────────────────────────────────────────────────────
console.log('\n🚌 Seeding transport...');

const transportData = [
  { si: 0, route: 'Route A — Lekki', pickup: '14 Admiralty Way, Lekki Phase 1',  pickupTime: '06:45', dropoff: 'School Gate', dropoffTime: '07:30', fee: 15000 },
  { si: 2, route: 'Route B — Ajah',  pickup: '7 Badore Road, Ajah',              pickupTime: '06:30', dropoff: 'School Gate', dropoffTime: '07:25', fee: 12000 },
  { si: 4, route: 'Route A — Lekki', pickup: '22 Admiralty Way, Lekki Phase 1',  pickupTime: '06:45', dropoff: 'School Gate', dropoffTime: '07:30', fee: 15000 },
];

const transportRows = transportData.map(t => ({
  student_id: students[t.si].id,
  route_name: t.route,
  pickup_location: t.pickup,
  pickup_time: t.pickupTime,
  dropoff_location: t.dropoff,
  dropoff_time: t.dropoffTime,
  monthly_fee: t.fee,
  is_active: true,
}));

const { error: transErr } = await supabase.from('transport').insert(transportRows);
if (transErr) fail(`Transport: ${transErr.message}`);
else log(`${transportRows.length} transport records created`);

// ── 7. MESSAGES ───────────────────────────────────────────────────────────────
console.log('\n💬 Seeding messages...');

const messageRows = [];

// Broadcast from admin to all parents
messageRows.push({
  sender_id: adminId,
  recipient_id: null,
  target_role: 'parent',
  subject: 'Welcome to the First Term 2025/2026',
  body: `Dear Parents and Guardians,\n\nWelcome to the First Term of the 2025/2026 Academic Year! We are delighted to have your children back at Greenville Montessori Schools.\n\nThis term, we have an exciting academic programme lined up. Please ensure your ward:\n• Arrives at school by 7:45 AM daily\n• Comes with complete school uniform\n• Has all required textbooks and stationery\n\nOur school portal is now live — you can view your child's attendance, grades, fees, and timetable at any time.\n\nFeel free to contact us via this platform if you have any questions.\n\nWith warm regards,\nThe Management\nGreenville Montessori Schools`,
  is_read: false,
});

// Broadcast from admin to all teachers
messageRows.push({
  sender_id: adminId,
  recipient_id: null,
  target_role: 'teacher',
  subject: 'Staff Briefing — First Term Academic Calendar',
  body: `Dear Staff,\n\nThis is a reminder of key dates for the First Term 2025/2026:\n\n• School fees payment deadline: 15th January 2026\n• Mid-term break: 10th–14th February 2026\n• First term examinations: 24th–28th February 2026\n• Prize giving day: 7th March 2026\n• School closes: 7th March 2026\n• Second term resumes: 28th April 2026\n\nPlease submit your lesson plans and continuous assessment scores by the end of each month.\n\nThank you for your dedication.\n\nThe Management`,
  is_read: false,
});

// Direct message from admin to teacher 1 (if exists)
if (teacher1ProfileId) {
  messageRows.push({
    sender_id: adminId,
    recipient_id: teacher1ProfileId,
    target_role: null,
    subject: 'Basic 3A Class Performance — Mid Term Review',
    body: `Dear Mrs. Adaeze,\n\nI have reviewed the mid-term academic performance for Basic 3A. Overall, the class is performing commendably.\n\nNotable observations:\n• Chidera Nwosu continues to excel across all subjects\n• Fatima Bello has shown great improvement in Mathematics\n• Emmanuel Obi needs additional support — please schedule a parent-teacher meeting\n\nKindly ensure that all CA scores are submitted on the portal before the exam week.\n\nThank you for your excellent work with the class.\n\nBest regards,\nThe Principal`,
    is_read: false,
  });
}

// Direct from teacher 1 to admin (reply)
if (teacher1ProfileId) {
  messageRows.push({
    sender_id: teacher1ProfileId,
    recipient_id: adminId,
    target_role: null,
    subject: 'Re: Basic 3A Class Performance — Mid Term Review',
    body: `Dear Principal,\n\nThank you for the feedback. I agree with your assessment.\n\nRegarding Emmanuel Obi, I have already spoken with the parents informally. They have agreed to arrange extra lessons. I will schedule a formal meeting this week.\n\nAll CA scores will be uploaded to the portal by Friday.\n\nBest regards,\nMrs. Adaeze Okonkwo`,
    is_read: true,
  });
}

const { error: msgErr } = await supabase.from('messages').insert(messageRows);
if (msgErr) fail(`Messages: ${msgErr.message}`);
else log(`${messageRows.length} messages created`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n✅ Full demo seed complete!\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('  MODULE          RECORDS CREATED');
console.log('───────────────────────────────────────────────────────────');
console.log(`  Attendance      ${attendanceRows.length} records (4 weeks, 5 students)`);
console.log(`  Timetable       ${timetableRows.length} slots (Mon–Fri, 8 periods/day)`);
console.log(`  Announcements   ${announcements.length} published`);
console.log(`  Fees            ${feeRows.length} records (5 types × 5 students)`);
console.log(`  Health Records  ${healthRows.length} records`);
console.log(`  Transport       ${transportRows.length} routes`);
console.log(`  Messages        ${messageRows.length} messages`);
console.log('═══════════════════════════════════════════════════════════');
console.log('\n  LOGIN CREDENTIALS:');
console.log('  Admin:   admin@greenvillemontessorischools.ng    / Admin123!');
console.log('  Teacher: teacher.adaeze@greenvillemontessorischools.ng / Teacher123!');
console.log('  Teacher: teacher.emeka@greenvillemontessorischools.ng  / Teacher123!');
console.log('  Student: chidera.nwosu@greenvillemontessorischools.ng  / Student123!');
console.log('  Student: amaka.okafor@greenvillemontessorischools.ng   / Student123!');
console.log('  Student: tobi.adeyemi@greenvillemontessorischools.ng   / Student123!');
console.log('  Student: fatima.bello@greenvillemontessorischools.ng   / Student123!');
console.log('  Student: emmanuel.obi@greenvillemontessorischools.ng   / Student123!');
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(0);
