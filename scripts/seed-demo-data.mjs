/**
 * Seed demo data for Toddler, KG, and Basic levels:
 * - Toddler Class: 'Pre-KG' (Level: 'toddler')
 * - KG/Nursery Class: 'KG 1' (Level: 'creche')
 * - Basic Class: 'Basic 3A' (Level: 'basic3')
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

const ADMIN_EMAIL = 'admin@greenvillemontessorischools.ng';
const ADMIN_PASSWORD = 'Admin123!';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TERM = 'First Term';
const ACADEMIC_YEAR = '2025/2026';
const TEACHER_PASSWORD = 'Teacher123!';
const STUDENT_PASSWORD = 'Student123!';

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`  ✓ ${msg}`); }
function err(msg) { console.error(`  ✗ ${msg}`); }

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function isAuthEmailTakenError(msg) {
  const m = (msg || '').toLowerCase();
  return m.includes('already exists') || m.includes('already registered');
}

/** Returns profiles row (id = profile uuid). Creates auth user + profile when missing. */
async function ensureProfile(email, firstName, lastName, role, extraProfileFields = {}) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, user_id, email, first_name, last_name')
    .eq('email', email)
    .maybeSingle();
  if (existing) return existing;

  const pwd = email.includes('teacher.') ? TEACHER_PASSWORD : STUDENT_PASSWORD;
  const { data: userId, error } = await supabase.rpc('admin_create_user', {
    user_email: email,
    user_password: pwd,
    user_first_name: firstName,
    user_last_name: lastName,
    profile_role: role,
  });

  if (error) {
    if (isAuthEmailTakenError(error.message)) {
      const { data: again } = await supabase
        .from('profiles')
        .select('id, user_id, email, first_name, last_name')
        .eq('email', email)
        .maybeSingle();
      if (again) return again;
      throw new Error(
        `Auth user exists for ${email} but no profile row — add a profiles row or remove the orphan auth user.`,
      );
    }
    throw new Error(`admin_create_user(${email}): ${error.message}`);
  }

  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('id, user_id, email, first_name, last_name')
    .eq('user_id', userId)
    .single();
  if (pErr) throw pErr;

  const extras = { ...extraProfileFields };
  if (Object.keys(extras).length) {
    const { data: upd, error: uErr } = await supabase
      .from('profiles')
      .update(extras)
      .eq('id', prof.id)
      .select('id, user_id, email, first_name, last_name')
      .single();
    if (uErr) throw uErr;
    return upd;
  }
  return prof;
}

async function main() {
  // ── Step 1: Sign in as admin ──────────────────────────────────────────────────
  console.log('\n🔑 Signing in as admin...');
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (signInErr) { err(signInErr.message); process.exit(1); }
  log('Signed in as admin');

  // ── Step 2: Create teachers ───────────────────────────────────────────────────
  console.log('\n👩‍🏫 Creating teachers...');
  const teachers = [
    { email: 'teacher.adaeze@greenvillemontessorischools.ng', firstName: 'Adaeze', lastName: 'Okonkwo', phone: '08031234567', qualification: 'B.Ed Mathematics',          specialization: 'Mathematics & Basic Science' },
    { email: 'teacher.emeka@greenvillemontessorischools.ng',  firstName: 'Emeka',  lastName: 'Eze',     phone: '08057654321', qualification: 'B.Ed English',              specialization: 'English Language & Social Studies' },
    { email: 'teacher.ifeoma@greenvillemontessorischools.ng', firstName: 'Ifeoma', lastName: 'Okeke',   phone: '08099887766', qualification: 'B.Ed Primary Education',    specialization: 'Primary Education & Class Management' },
  ];

  const createdTeachers = [];
  for (let ti = 0; ti < teachers.length; ti++) {
    const t = teachers[ti];
    try {
      const prof = await ensureProfile(t.email, t.firstName, t.lastName, 'teacher', {
        phone: t.phone,
      });

      const empId = `TCH-2026-${String(ti + 1).padStart(3, '0')}`;
      let tRow = null;
      const { data: existingT } = await supabase
        .from('teachers')
        .select('*')
        .eq('profile_id', prof.id)
        .maybeSingle();
      if (existingT) {
        tRow = existingT;
        log(`Teacher (existing): ${t.firstName} ${t.lastName} (${tRow.employee_id})`);
      } else {
        const { data: ins, error: tErr } = await supabase
          .from('teachers')
          .insert({
            profile_id: prof.id,
            employee_id: empId,
            qualification: t.qualification,
            specialization: t.specialization,
            hire_date: '2024-09-01',
          })
          .select()
          .single();
        if (tErr) throw tErr;
        tRow = ins;
        log(`Teacher: ${t.firstName} ${t.lastName} (${empId}) — ${t.email} / ${TEACHER_PASSWORD}`);
      }

      createdTeachers.push({
        ...tRow,
        profileId: prof.id,
        profileUuid: prof.id,
        email: t.email,
        fullName: `${t.firstName} ${t.lastName}`,
      });
    } catch (e) {
      err(`Teacher ${t.firstName}: ${e.message}`);
    }
  }

  // Get admin profile id for graded_by / created_by
  const { data: { user } } = await supabase.auth.getUser();
  const { data: adminProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  const adminId = adminProfile.id;

  // Define multi-class configurations
  const classesToSeed = [
    {
      name: 'Pre-KG',
      level: 'toddler',
      teacherIdx: 0,
      students: [
        { email: 'zara.eze@greenvillemontessorischools.ng', firstName: 'Zara', lastName: 'Eze', gender: 'female', dob: '2023-04-10' },
        { email: 'kene.chukwu@greenvillemontessorischools.ng', firstName: 'Kene', lastName: 'Chukwu', gender: 'male', dob: '2023-01-15' },
        { email: 'somto.okafor@greenvillemontessorischools.ng', firstName: 'Somto', lastName: 'Okafor', gender: 'male', dob: '2022-11-05' },
        { email: 'chimamanda.nwosu@greenvillemontessorischools.ng', firstName: 'Chimamanda', lastName: 'Nwosu', gender: 'female', dob: '2023-05-20' },
        { email: 'funmi.adeyemi@greenvillemontessorischools.ng', firstName: 'Funmi', lastName: 'Adeyemi', gender: 'female', dob: '2022-09-12' },
      ],
      subjects: [
        { name: 'Literacy', code: 'LIT', teacherIdx: 0 },
        { name: 'Understanding', code: 'UND', teacherIdx: 0 },
        { name: 'Obedience', code: 'OBD', teacherIdx: 0 },
        { name: 'Care of Self', code: 'SLF', teacherIdx: 0 },
        { name: 'Individual Behaviour', code: 'BHV', teacherIdx: 0 },
        { name: 'Punctuality', code: 'PNC', teacherIdx: 0 },
        { name: 'Numeracy', code: 'NUM', teacherIdx: 0 },
        { name: 'Bible Studies', code: 'BIB', teacherIdx: 0 },
        { name: 'Creative Play', code: 'CRT', teacherIdx: 0 },
        { name: 'Phonics', code: 'PHN', teacherIdx: 0 },
        { name: 'Scribbling', code: 'SCR', teacherIdx: 0 },
        { name: 'Social Habit', code: 'SOC', teacherIdx: 0 },
      ],
    },
    {
      name: 'KG 1',
      level: 'creche',
      teacherIdx: 1,
      students: [
        { email: 'kelechi.eze@greenvillemontessorischools.ng', firstName: 'Kelechi', lastName: 'Eze', gender: 'male', dob: '2021-03-14' },
        { email: 'chinonso.okafor@greenvillemontessorischools.ng', firstName: 'Chinonso', lastName: 'Okafor', gender: 'female', dob: '2020-10-22' },
        { email: 'tunde.adeyemi@greenvillemontessorischools.ng', firstName: 'Tunde', lastName: 'Adeyemi', gender: 'male', dob: '2021-01-05' },
        { email: 'amina.bello@greenvillemontessorischools.ng', firstName: 'Amina', lastName: 'Bello', gender: 'female', dob: '2020-12-18' },
        { email: 'chioma.obi@greenvillemontessorischools.ng', firstName: 'Chioma', lastName: 'Obi', gender: 'female', dob: '2021-06-30' },
      ],
      subjects: [
        { name: 'Numeracy Skills', code: 'K_NUM', teacherIdx: 1 },
        { name: 'Literacy Development', code: 'K_LIT', teacherIdx: 1 },
        { name: 'Phonic Skills', code: 'K_PHN', teacherIdx: 1 },
        { name: 'Writing Skills', code: 'K_WRT', teacherIdx: 1 },
        { name: 'Social Habit', code: 'K_SOC', teacherIdx: 1 },
        { name: 'Music', code: 'K_MUS', teacherIdx: 1 },
        { name: 'Cultural Subject', code: 'K_CUL', teacherIdx: 1 },
        { name: 'Bible Knowledge', code: 'K_BIB', teacherIdx: 1 },
        { name: 'Practice Life Exercise', code: 'K_PLE', teacherIdx: 1 },
        { name: 'Sensorial', code: 'K_SEN', teacherIdx: 1 },
        { name: 'General Science', code: 'K_SCI', teacherIdx: 1 },
        { name: 'French', code: 'K_FRE', teacherIdx: 1 },
        { name: 'Coding', code: 'K_COD', teacherIdx: 1 },
      ],
    },
    {
      name: 'Basic 3A',
      level: 'basic3',
      teacherIdx: 2,
      students: [
        { email: 'chidera.nwosu@greenvillemontessorischools.ng',   firstName: 'Chidera',   lastName: 'Nwosu',    gender: 'male',   dob: '2015-03-12' },
        { email: 'amaka.okafor@greenvillemontessorischools.ng',    firstName: 'Amaka',     lastName: 'Okafor',   gender: 'female', dob: '2015-07-20' },
        { email: 'tobi.adeyemi@greenvillemontessorischools.ng',    firstName: 'Tobi',      lastName: 'Adeyemi',  gender: 'male',   dob: '2015-01-05' },
        { email: 'fatima.bello@greenvillemontessorischools.ng',    firstName: 'Fatima',    lastName: 'Bello',    gender: 'female', dob: '2014-11-30' },
        { email: 'emmanuel.obi@greenvillemontessorischools.ng',    firstName: 'Emmanuel',  lastName: 'Obi',      gender: 'male',   dob: '2015-09-18' },
      ],
      subjects: [
        { name: 'Mathematics/Quantitative',          code: 'MATH', teacherIdx: 0 },
        { name: 'English Language/Verbal Reasoning', code: 'ENG',  teacherIdx: 1 },
        { name: 'Basic Science',                     code: 'BSC',  teacherIdx: 0 },
        { name: 'Religion & National Values',        code: 'RNV',  teacherIdx: 1 },
        { name: 'Agricultural Science',              code: 'AGR',  teacherIdx: 2 },
        { name: 'French',                            code: 'FRE',  teacherIdx: 1 },
        { name: 'Computer Science',                  code: 'CSC',  teacherIdx: 2 },
        { name: 'Physical and Health Education',     code: 'PHE',  teacherIdx: 2 },
        { name: 'Home Economics',                    code: 'HEC',  teacherIdx: 2 },
        { name: 'Handwriting',                       code: 'HWR',  teacherIdx: 2 },
        { name: 'Music',                             code: 'MUS',  teacherIdx: 1 },
        { name: 'Coding',                            code: 'COD',  teacherIdx: 2 },
      ],
    },
  ];

  // loops for each class setup
  for (const classConf of classesToSeed) {
    console.log(`\n🏫 Seeding level class: ${classConf.name} (${classConf.level})...`);
    
    // Create class row
    const classTeacherProfileId = createdTeachers[classConf.teacherIdx]?.profileId ?? null;
    const { data: existingClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('name', classConf.name)
      .eq('academic_year', ACADEMIC_YEAR)
      .limit(1);

    let classRow = existingClasses?.[0] ?? null;

    if (classRow) {
      log(`Class already exists: ${classConf.name} (${classRow.id})`);
      if (!classRow.teacher_id && classTeacherProfileId) {
        const { error: upErr } = await supabase
          .from('classes')
          .update({ teacher_id: classTeacherProfileId })
          .eq('id', classRow.id);
        if (upErr) err(`Could not set class teacher: ${upErr.message}`);
        else classRow = { ...classRow, teacher_id: classTeacherProfileId };
      }
    } else {
      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .insert({
          name: classConf.name,
          level: classConf.level,
          academic_year: ACADEMIC_YEAR,
          teacher_id: classTeacherProfileId,
          capacity: 25,
        })
        .select()
        .single();

      if (clsErr) {
        err(`Could not create class ${classConf.name}: ${clsErr.message}`);
        process.exit(1);
      }
      log(`Class created: ${classConf.name} (${cls.id})`);
      classRow = cls;
    }

    // Create students
    console.log(`👦 Creating students for ${classConf.name}...`);
    const createdStudents = [];
    for (let si = 0; si < classConf.students.length; si++) {
      const s = classConf.students[si];
      try {
        const prof = await ensureProfile(s.email, s.firstName, s.lastName, 'student', {});
        const studentId = `QFS-2026-${classConf.level.slice(0,3).toUpperCase()}-${String(si + 1).padStart(3, '0')}`;

        const { data: existingSt } = await supabase
          .from('students')
          .select('*')
          .eq('profile_id', prof.id)
          .maybeSingle();

        let stRow = existingSt;
        if (existingSt) {
          if (existingSt.class_id !== classRow.id || existingSt.student_id !== studentId) {
            const { data: upd, error: uErr } = await supabase
              .from('students')
              .update({
                class_id: classRow.id,
                student_id: studentId,
                gender: s.gender,
                date_of_birth: s.dob,
              })
              .eq('id', existingSt.id)
              .select()
              .single();
            if (uErr) throw uErr;
            stRow = upd;
          }
          log(`Student (existing): ${s.firstName} ${s.lastName} (${studentId})`);
        } else {
          const { data: ins, error: stErr } = await supabase
            .from('students')
            .insert({
              profile_id: prof.id,
              student_id: studentId,
              class_id: classRow.id,
              gender: s.gender,
              date_of_birth: s.dob,
            })
            .select()
            .single();
          if (stErr) throw stErr;
          stRow = ins;
          log(`Student: ${s.firstName} ${s.lastName} (${studentId}) — ${s.email} / ${STUDENT_PASSWORD}`);
        }

        createdStudents.push({
          ...stRow,
          profileId: prof.id,
          fullName: `${s.firstName} ${s.lastName}`,
          email: s.email,
        });
      } catch (e) {
        err(`Student ${s.firstName}: ${e.message}`);
      }
    }

    // Create subjects
    console.log(`📚 Creating subjects for ${classConf.name}...`);
    const createdSubjects = [];
    for (const sub of classConf.subjects) {
      const teacherProfileId = createdTeachers[sub.teacherIdx]?.profileId ?? null;
      const row = {
        name: sub.name,
        code: sub.code,
        class_id: classRow.id,
        teacher_id: teacherProfileId,
        term: TERM,
        academic_year: ACADEMIC_YEAR,
      };
      const { data: subRow, error: subErr } = await supabase
        .from('subjects')
        .upsert(row, { onConflict: 'name,class_id,term,academic_year' })
        .select()
        .single();

      if (subErr) {
        err(`Subject ${sub.name}: ${subErr.message}`);
      } else {
        createdSubjects.push(subRow);
        log(`Subject: ${sub.name} (${sub.code})`);
      }
    }

    // Create grades
    console.log(`📊 Creating grades for ${classConf.name}...`);
    const studentIdsForGrades = createdStudents.map((s) => s.id);
    if (studentIdsForGrades.length && createdSubjects.length) {
      await supabase
        .from('grades')
        .delete()
        .in('student_id', studentIdsForGrades)
        .eq('term', TERM)
        .eq('academic_year', ACADEMIC_YEAR);
    }

    const gradeInserts = [];
    
    // Performance profiles for ca1, ca2, exam, project, homework
    const studentProfiles = [
      { ca1: [13, 15], ca2: [13, 15], project: [8, 10], homework: [8, 10], exam: [42, 50], rating: [4, 5] }, // zara/kelechi/chidera — top
      { ca1: [11, 13], ca2: [11, 13], project: [7, 9],  homework: [7, 9],  exam: [38, 44], rating: [4, 4] }, // kene/chinonso/amaka — good
      { ca1: [9, 12],  ca2: [9, 12],  project: [6, 8],  homework: [6, 8],  exam: [30, 38], rating: [3, 4] }, // somto/tunde/tobi — average
      { ca1: [12, 14], ca2: [12, 14], project: [7, 9],  homework: [8, 10], exam: [37, 43], rating: [4, 5] }, // chimamanda/amina/fatima — good
      { ca1: [7, 10],  ca2: [7, 10],  project: [5, 7],  homework: [5, 7],  exam: [25, 32], rating: [2, 3] }, // funmi/chioma/emmanuel — below avg
    ];

    for (let si = 0; si < createdStudents.length; si++) {
      const student = createdStudents[si];
      const profile = studentProfiles[si] || studentProfiles[4];
      
      for (const subject of createdSubjects) {
        if (classConf.level === 'toddler') {
          // Toddler rating directly out of 5
          const scoreVal = randInt(...profile.rating);
          gradeInserts.push({
            student_id: student.id,
            subject: subject.name,
            assessment_type: 'pre_kg',
            score: scoreVal,
            max_score: 5,
            term: TERM,
            academic_year: ACADEMIC_YEAR,
            graded_by: adminId,
          });
        } else {
          // Nursery and Basic classes get standard raw point structures
          gradeInserts.push(
            { student_id: student.id, subject: subject.name, assessment_type: '1st CA',  score: randInt(...profile.ca1),      max_score: 15, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: adminId },
            { student_id: student.id, subject: subject.name, assessment_type: '2nd CA',  score: randInt(...profile.ca2),      max_score: 15, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: adminId },
            { student_id: student.id, subject: subject.name, assessment_type: 'Project', score: randInt(...profile.project),  max_score: 10, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: adminId },
            { student_id: student.id, subject: subject.name, assessment_type: 'Homework',score: randInt(...profile.homework), max_score: 10, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: adminId },
            { student_id: student.id, subject: subject.name, assessment_type: 'Exam',    score: randInt(...profile.exam),      max_score: 50, term: TERM, academic_year: ACADEMIC_YEAR, graded_by: adminId },
          );
        }
      }
    }

    const { error: gradeErr } = await supabase.from('grades').insert(gradeInserts);
    if (gradeErr) {
      err(`Grades insert error for ${classConf.name}: ` + gradeErr.message);
    } else {
      log(`${gradeInserts.length} grade records created for ${classConf.name}`);
    }

    // Create result sheets
    console.log(`📋 Creating result sheets for ${classConf.name}...`);
    // Toddler/Pre-KG uses short 3-7 word phrases; nursery/basic use full sentences
    const isToddlerClass = classConf.level === 'toddler';
    const teacherComments = isToddlerClass ? [
      'Great effort this term!',
      'Excellent student, well done!',
      'Good work, keep it up!',
      'Brilliant performance this term!',
      'Making steady progress!',
    ] : [
      'An exceptional student who consistently demonstrates outstanding enthusiasm and comprehension.',
      'Shows remarkable improvement and dedication. A highly commendable effort this term.',
      'A diligent pupil who participates nicely. With continued focus, even greater heights will be reached.',
      'Very bright and enthusiastic learner. A delightful presence in the classroom.',
      'Shows good potential and is making steady progress. We encourage more dedication next term.',
    ];
    const principalComments = isToddlerClass ? [
      'Well done, keep it up!',
      'Proud of your progress!',
      'Excellent work this term!',
      'Outstanding effort, bravo!',
      'Keep improving, well done!',
    ] : [
      "Outstanding performance! We are extremely proud of these achievements.",
      "Performed admirably. We look forward to continued excellence next term.",
      "Satisfactory performance. We encourage aiming higher next term.",
      "Has done very well this term. Keep up the commendable effort!",
      "Steady progress made. Consistent practice will guarantee better results.",
    ];

    const behaviorByRank = [
      { punctuality: 5, neatness: 5, honesty: 5, cooperation: 5, attentiveness: 5, politeness: 5 },
      { punctuality: 4, neatness: 5, honesty: 4, cooperation: 4, attentiveness: 4, politeness: 5 },
      { punctuality: 4, neatness: 3, honesty: 4, cooperation: 4, attentiveness: 3, politeness: 4 },
      { punctuality: 5, neatness: 4, honesty: 5, cooperation: 5, attentiveness: 4, politeness: 5 },
      { punctuality: 3, neatness: 3, honesty: 4, cooperation: 3, attentiveness: 3, politeness: 3 },
    ];

    for (let si = 0; si < createdStudents.length; si++) {
      const student = createdStudents[si];
      const absent = randInt(0, si * 2);
      const payload = {
        student_id: student.id,
        term: TERM,
        academic_year: ACADEMIC_YEAR,
        ...behaviorByRank[si],
        total_school_days: 60,
        days_present: 60 - absent,
        days_absent: absent,
        teacher_comment: teacherComments[si],
        principal_comment: principalComments[si],
        next_term_begins: '2026-04-28',
        next_term_fees: '120,000',
        is_published: true,
        created_by: adminId,
      };

      const { error: rsErr } = await supabase
        .from('result_sheets')
        .upsert(payload, { onConflict: 'student_id,term,academic_year' });

      if (rsErr) {
        err(`Result sheet for ${student.fullName}: ${rsErr.message}`);
      } else {
        log(`Result sheet saved & published for ${student.fullName}`);
      }
    }
  }

  console.log('\n✅ Comprehensive multi-level seed complete!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\nUnexpected error during seeding:', err);
  process.exit(1);
});
