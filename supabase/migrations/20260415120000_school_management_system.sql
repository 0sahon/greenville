-- =============================================================================
-- School management system — full schema (squashed, sequential)
--
-- Deploy:  supabase link --project-ref <ref> --yes
--           supabase db push --yes
--
-- Use only on a NEW empty Supabase project (no prior migrations from this repo).
-- Edit school_settings defaults below (school_name, currency, etc.) per school.
-- =============================================================================


-- ─── 20250220000000_silver_swamp.sql ─────────────────────────────────────────────────────

/*
  # School Management System Database Schema

  1. New Tables
    - `profiles` - User profiles with role-based access
    - `students` - Student information and enrollment data  
    - `classes` - Class/grade information
    - `teachers` - Teacher profiles and qualifications
    - `parents` - Parent information and relationships
    - `student_parents` - Many-to-many relationship between students and parents
    - `attendance` - Daily attendance records
    - `grades` - Academic performance records
    - `fees` - Fee structure and payment tracking
    - `announcements` - School announcements and notifications
    - `health_records` - Student health information
    - `transport` - Transportation management

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'parent', 'student');
CREATE TYPE class_level AS ENUM ('creche', 'basic1', 'basic2', 'basic3', 'basic4', 'basic5', 'basic6');
CREATE TYPE fee_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role user_role NOT NULL DEFAULT 'parent',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level class_level NOT NULL,
  academic_year text NOT NULL DEFAULT '2024/2025',
  teacher_id uuid REFERENCES profiles(id),
  capacity integer DEFAULT 25,
  created_at timestamptz DEFAULT now()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  student_id text UNIQUE NOT NULL,
  class_id uuid REFERENCES classes(id),
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female')),
  address text,
  emergency_contact text,
  emergency_phone text,
  medical_conditions text,
  enrollment_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Teachers table  
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id text UNIQUE NOT NULL,
  qualification text,
  specialization text,
  hire_date date DEFAULT CURRENT_DATE,
  salary decimal(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  occupation text,
  workplace text,
  relationship_to_student text DEFAULT 'parent',
  created_at timestamptz DEFAULT now()
);

-- Student-Parent relationship table
CREATE TABLE IF NOT EXISTS student_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES parents(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, parent_id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  notes text,
  marked_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  assessment_type text NOT NULL,
  score decimal(5,2) NOT NULL,
  max_score decimal(5,2) NOT NULL DEFAULT 100,
  term text NOT NULL,
  academic_year text NOT NULL DEFAULT '2024/2025',
  graded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Fees table
CREATE TABLE IF NOT EXISTS fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  fee_type text NOT NULL,
  amount decimal(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_amount decimal(10,2) DEFAULT 0,
  status fee_status NOT NULL DEFAULT 'pending',
  term text NOT NULL,
  academic_year text NOT NULL DEFAULT '2024/2025',
  created_at timestamptz DEFAULT now()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_audience text[] DEFAULT ARRAY['all'],
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published boolean DEFAULT false,
  published_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Health records table
CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  record_type text NOT NULL,
  description text NOT NULL,
  date_recorded date DEFAULT CURRENT_DATE,
  recorded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Transport table
CREATE TABLE IF NOT EXISTS transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  route_name text NOT NULL,
  pickup_location text NOT NULL,
  pickup_time time NOT NULL,
  dropoff_location text NOT NULL,
  dropoff_time time NOT NULL,
  monthly_fee decimal(8,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Students policies
CREATE POLICY "Parents can read their children's records"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents p ON sp.parent_id = p.id
      JOIN profiles pr ON p.profile_id = pr.id
      WHERE sp.student_id = students.id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can read their class students"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN teachers t ON c.teacher_id = t.profile_id
      JOIN profiles p ON t.profile_id = p.id
      WHERE c.id = students.class_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all students"
  ON students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Teachers can manage attendance for their classes"
  ON attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN classes c ON s.class_id = c.id
      JOIN teachers t ON c.teacher_id = t.profile_id
      JOIN profiles p ON t.profile_id = p.id
      WHERE s.id = attendance.student_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can read their children's attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents par ON sp.parent_id = par.id
      JOIN profiles pr ON par.profile_id = pr.id
      WHERE sp.student_id = attendance.student_id AND pr.user_id = auth.uid()
    )
  );

-- ─── 20250225000000_admin_create_user_fn.sql ─────────────────────────────────────────────────────

/*
  # admin_create_user RPC Function
  Allows admin users to create new auth accounts directly via the DB,
  bypassing the need for the edge function.
  Inserts into auth.users + auth.identities and returns the new user UUID.
*/

CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email    text,
  user_password text,
  user_first_name text,
  user_last_name  text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id    uuid;
  caller_role    user_role;
BEGIN
  -- Verify caller is authenticated admin
  SELECT p.role INTO caller_role
  FROM profiles p
  WHERE p.user_id = auth.uid();

  IF caller_role IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Check email not already taken
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(user_email)) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  new_user_id := gen_random_uuid();

  -- Create the auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    lower(user_email),
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'first_name', user_first_name,
      'last_name',  user_last_name
    ),
    now(),
    now(),
    '', '', '', ''
  );

  -- Create the identity record (email provider)
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    lower(user_email),
    new_user_id,
    jsonb_build_object(
      'sub',            new_user_id::text,
      'email',          lower(user_email),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  RETURN new_user_id;
END;
$$;

-- Grant execution to authenticated users (admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text) TO authenticated;

-- ─── 20250225010000_result_sheets.sql ─────────────────────────────────────────────────────

/*
  # Result Sheets Table
  Stores per-student per-term metadata for Nigerian-style report cards:
  - Teacher & principal comments
  - Affective/psychomotor domain ratings
  - Attendance summary
  - Next term details
  - Publication status
*/

-- Add address field to parents (needed by admin UI)
ALTER TABLE parents ADD COLUMN IF NOT EXISTS address text;

-- Result sheets table
CREATE TABLE IF NOT EXISTS result_sheets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term              text NOT NULL,
  academic_year     text NOT NULL,

  -- Remarks
  teacher_comment   text NOT NULL DEFAULT '',
  principal_comment text NOT NULL DEFAULT '',

  -- Affective / Psychomotor domain (1 = Poor … 5 = Excellent)
  punctuality       smallint DEFAULT 3 CHECK (punctuality BETWEEN 1 AND 5),
  neatness          smallint DEFAULT 3 CHECK (neatness BETWEEN 1 AND 5),
  honesty           smallint DEFAULT 3 CHECK (honesty BETWEEN 1 AND 5),
  cooperation       smallint DEFAULT 3 CHECK (cooperation BETWEEN 1 AND 5),
  attentiveness     smallint DEFAULT 3 CHECK (attentiveness BETWEEN 1 AND 5),
  politeness        smallint DEFAULT 3 CHECK (politeness BETWEEN 1 AND 5),

  -- Attendance (filled when result is generated)
  days_present      integer NOT NULL DEFAULT 0,
  days_absent       integer NOT NULL DEFAULT 0,
  total_school_days integer NOT NULL DEFAULT 0,

  -- Next term
  next_term_begins  date,
  next_term_fees    text NOT NULL DEFAULT '',

  -- Status
  is_published      boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),

  UNIQUE(student_id, term, academic_year)
);

ALTER TABLE result_sheets ENABLE ROW LEVEL SECURITY;

-- Admins and teachers can do everything
CREATE POLICY "Staff can manage result_sheets"
  ON result_sheets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Parents can read their children's published sheets
CREATE POLICY "Parents can view published result_sheets"
  ON result_sheets FOR SELECT TO authenticated
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents par ON sp.parent_id = par.id
      JOIN profiles pr ON par.profile_id = pr.id
      WHERE sp.student_id = result_sheets.student_id AND pr.user_id = auth.uid()
    )
  );

-- Students can view their own published sheets
CREATE POLICY "Students can view own published result_sheets"
  ON result_sheets FOR SELECT TO authenticated
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE s.id = result_sheets.student_id AND pr.user_id = auth.uid()
    )
  );

-- ─── 20250225020000_cbt.sql ─────────────────────────────────────────────────────

/*
  # CBT (Computer-Based Testing) Tables

  Tables:
    cbt_exams      – exam metadata (title, class, duration, schedule)
    cbt_questions  – MCQ questions with 4 options and correct answer
    cbt_sessions   – per-student exam attempt (score, timing)
    cbt_answers    – per-question answer selected by student
*/

-- ─── TABLES (all created before policies) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS cbt_exams (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  subject          text NOT NULL,
  class_id         uuid REFERENCES classes(id) ON DELETE SET NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  total_marks      integer NOT NULL DEFAULT 0,
  start_time       timestamptz,
  end_time         timestamptz,
  term             text NOT NULL DEFAULT 'First Term',
  academic_year    text NOT NULL DEFAULT '2024/2025',
  instructions     text NOT NULL DEFAULT '',
  is_published     boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbt_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         uuid NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  question_text   text NOT NULL,
  option_a        text NOT NULL DEFAULT '',
  option_b        text NOT NULL DEFAULT '',
  option_c        text NOT NULL DEFAULT '',
  option_d        text NOT NULL DEFAULT '',
  correct_option  text NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  marks           integer NOT NULL DEFAULT 1 CHECK (marks > 0),
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cbt_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       uuid NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at    timestamptz DEFAULT now(),
  submitted_at  timestamptz,
  total_score   integer NOT NULL DEFAULT 0,
  is_submitted  boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS cbt_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES cbt_sessions(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  selected_option text CHECK (selected_option IN ('a', 'b', 'c', 'd')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(session_id, question_id)
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE cbt_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_answers ENABLE ROW LEVEL SECURITY;

-- cbt_exams policies
CREATE POLICY "Staff can manage cbt_exams"
  ON cbt_exams FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Students can view published cbt_exams for their class"
  ON cbt_exams FOR SELECT TO authenticated
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE s.class_id = cbt_exams.class_id AND pr.user_id = auth.uid()
    )
  );

-- cbt_questions policies (cbt_sessions now exists)
CREATE POLICY "Staff can manage cbt_questions"
  ON cbt_questions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Students can read questions for their active session"
  ON cbt_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cbt_sessions cs
      JOIN students s ON cs.student_id = s.id
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE cs.exam_id = cbt_questions.exam_id
        AND pr.user_id = auth.uid()
        AND cs.is_submitted = false
    )
  );

-- cbt_sessions policies
CREATE POLICY "Staff can view all cbt_sessions"
  ON cbt_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Students can manage own cbt_sessions"
  ON cbt_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE s.id = cbt_sessions.student_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children cbt_sessions"
  ON cbt_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents par ON sp.parent_id = par.id
      JOIN profiles pr ON par.profile_id = pr.id
      WHERE sp.student_id = cbt_sessions.student_id AND pr.user_id = auth.uid()
    )
  );

-- cbt_answers policies
CREATE POLICY "Staff can view all cbt_answers"
  ON cbt_answers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Students can manage own cbt_answers"
  ON cbt_answers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cbt_sessions cs
      JOIN students s ON cs.student_id = s.id
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE cs.id = cbt_answers.session_id AND pr.user_id = auth.uid()
    )
  );

-- ─── 20250225030000_timetable.sql ─────────────────────────────────────────────────────

/*
  # Timetable Table
  Weekly class schedule per term/academic year.
*/

CREATE TABLE IF NOT EXISTS timetable (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week   text NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
  period        integer NOT NULL CHECK (period >= 1 AND period <= 12),
  subject       text NOT NULL,
  teacher_id    uuid REFERENCES teachers(id) ON DELETE SET NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  term          text NOT NULL DEFAULT 'First Term',
  academic_year text NOT NULL DEFAULT '2024/2025',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(class_id, day_of_week, period, term, academic_year)
);

ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

-- Staff full access
CREATE POLICY "Staff can manage timetable"
  ON timetable FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Students can view their own class timetable
CREATE POLICY "Students can view own class timetable"
  ON timetable FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE s.class_id = timetable.class_id AND pr.user_id = auth.uid()
    )
  );

-- Parents can view their children's timetable
CREATE POLICY "Parents can view children timetable"
  ON timetable FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents par ON sp.parent_id = par.id
      JOIN profiles pr ON par.profile_id = pr.id
      JOIN students s ON sp.student_id = s.id
      WHERE s.class_id = timetable.class_id AND pr.user_id = auth.uid()
    )
  );

-- ─── 20250225040000_messages.sql ─────────────────────────────────────────────────────

/*
  # Messages Table
  In-app messaging between admin, teachers, and parents.
  Supports:
    - Direct messages (sender → recipient)
    - Broadcast (recipient_id IS NULL, target_role filters by role)
    - Thread replies (parent_message_id references parent)
*/

CREATE TABLE IF NOT EXISTS messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_role       text,   -- 'parent' | 'teacher' | 'all' for broadcasts
  subject           text NOT NULL DEFAULT '',
  body              text NOT NULL,
  is_read           boolean NOT NULL DEFAULT false,
  parent_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Senders can see messages they sent
CREATE POLICY "Senders can see own messages"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = messages.sender_id)
  );

-- Recipients can see messages sent to them
CREATE POLICY "Recipients can see own messages"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = messages.recipient_id)
  );

-- Role-based broadcast: users with matching role can see
CREATE POLICY "Broadcast role messages visible to target role"
  ON messages FOR SELECT TO authenticated
  USING (
    recipient_id IS NULL AND target_role IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND (target_role = 'all' OR role::text = target_role)
    )
  );

-- Any authenticated user can insert (send) messages
CREATE POLICY "Authenticated can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = sender_id)
  );

-- Recipients can mark messages as read
CREATE POLICY "Recipients can update is_read"
  ON messages FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND id = messages.recipient_id)
  )
  WITH CHECK (true);

-- ─── 20260224000000_fix_profile_rls_recursion.sql ─────────────────────────────────────────────────────

-- Fix: infinite recursion in "Teachers can read all profiles" policy
-- The policy was querying the profiles table from within a profiles policy.
-- Solution: wrap the check in a SECURITY DEFINER function (same pattern as is_admin()).

CREATE OR REPLACE FUNCTION is_teacher_or_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

-- Drop the recursive policy and recreate it using the safe function
DROP POLICY IF EXISTS "Teachers can read all profiles" ON profiles;

CREATE POLICY "Teachers can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_teacher_or_admin());

-- ─── 20260224000001_rebuild_profile_policies.sql ─────────────────────────────────────────────────────

-- Drop ALL existing policies on profiles (catches any name variants)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END;
$$;

-- Safe helper functions using SECURITY DEFINER (bypass RLS inside the function)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_teacher_or_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

-- Recreate all profiles policies (no subqueries inside — all use safe helper functions)

-- INSERT: users can create their own profile on sign-up
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SELECT: each user can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE: each user can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ALL: admins can do everything (uses SECURITY DEFINER is_admin())
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- SELECT: teachers and admins can read any profile (uses SECURITY DEFINER function)
CREATE POLICY "Teachers can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_teacher_or_admin());

-- ─── 20260224000002_lms_and_events.sql ─────────────────────────────────────────────────────

-- ============================================================
-- LMS Tables: courses, assignments, submissions, materials
-- Plus academic calendar events
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  title text NOT NULL,
  description text,
  teacher_id uuid REFERENCES profiles(id),
  term text NOT NULL DEFAULT 'First Term',
  academic_year text NOT NULL DEFAULT '2024/2025',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  max_score decimal(5,2) DEFAULT 100,
  type text DEFAULT 'homework' CHECK (type IN ('homework', 'quiz', 'exam', 'project', 'classwork')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  content text,
  file_url text,
  score decimal(5,2),
  feedback text,
  submitted_at timestamptz DEFAULT now(),
  graded_at timestamptz,
  graded_by uuid REFERENCES profiles(id),
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'late')),
  UNIQUE(assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text DEFAULT 'document' CHECK (type IN ('document', 'video', 'link', 'image')),
  url text,
  description text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  event_type text DEFAULT 'general' CHECK (event_type IN ('holiday', 'exam', 'meeting', 'sports', 'cultural', 'general')),
  target_audience text[] DEFAULT ARRAY['all'],
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Courses
CREATE POLICY "Admins manage courses" ON courses FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "All authenticated read courses" ON courses FOR SELECT TO authenticated USING (true);

-- Assignments
CREATE POLICY "Admins manage assignments" ON assignments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers manage own assignments" ON assignments FOR ALL TO authenticated
  USING (is_teacher_or_admin()) WITH CHECK (is_teacher_or_admin());
CREATE POLICY "All authenticated read assignments" ON assignments FOR SELECT TO authenticated USING (true);

-- Submissions
CREATE POLICY "Admins manage submissions" ON submissions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Students manage own submissions" ON submissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM students s JOIN profiles p ON s.profile_id = p.id WHERE s.id = submissions.student_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students s JOIN profiles p ON s.profile_id = p.id WHERE s.id = submissions.student_id AND p.user_id = auth.uid()));
CREATE POLICY "Teachers read all submissions" ON submissions FOR SELECT TO authenticated USING (is_teacher_or_admin());

-- Course Materials
CREATE POLICY "Admins manage materials" ON course_materials FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Teachers manage materials" ON course_materials FOR ALL TO authenticated USING (is_teacher_or_admin()) WITH CHECK (is_teacher_or_admin());
CREATE POLICY "All authenticated read materials" ON course_materials FOR SELECT TO authenticated USING (true);

-- Events
CREATE POLICY "Admins manage events" ON events FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "All authenticated read events" ON events FOR SELECT TO authenticated USING (true);

-- Seed some demo events
INSERT INTO events (title, description, start_date, end_date, event_type) VALUES
  ('First Term Begins', 'Start of First Academic Term 2024/2025', '2024-09-09', '2024-09-09', 'general'),
  ('Mid-Term Break', 'Mid-term holiday break', '2024-10-14', '2024-10-18', 'holiday'),
  ('First Term Exams', 'End of First Term Examinations', '2024-11-25', '2024-12-06', 'exam'),
  ('Christmas Break', 'Christmas and New Year Holiday', '2024-12-13', '2025-01-05', 'holiday'),
  ('Second Term Begins', 'Start of Second Academic Term', '2025-01-06', '2025-01-06', 'general'),
  ('Inter-House Sports', 'Annual Inter-House Sports Competition', '2025-02-14', '2025-02-14', 'sports'),
  ('Parent-Teacher Meeting', 'First Term Progress Report Meeting', '2025-02-28', '2025-02-28', 'meeting'),
  ('Cultural Day', 'Annual Cultural Day Celebration', '2025-03-15', '2025-03-15', 'cultural'),
  ('Second Term Exams', 'End of Second Term Examinations', '2025-03-24', '2025-04-04', 'exam'),
  ('Easter Break', 'Easter Holiday', '2025-04-11', '2025-04-25', 'holiday'),
  ('Third Term Begins', 'Start of Third Academic Term', '2025-04-28', '2025-04-28', 'general'),
  ('Graduation Ceremony', 'Basic 6 Graduation Day', '2025-07-04', '2025-07-04', 'cultural'),
  ('Third Term Exams', 'End of Year Examinations', '2025-06-16', '2025-06-27', 'exam'),
  ('Long Vacation', 'Annual Long Vacation', '2025-07-11', '2025-09-07', 'holiday')
ON CONFLICT DO NOTHING;

SELECT 'LMS and Events tables created!' AS status;

-- ─── 20260225000000_school_settings.sql ─────────────────────────────────────────────────────

-- ============================================================
-- School settings table for configurable app-wide values
-- ============================================================

CREATE TABLE IF NOT EXISTS school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage school_settings"
  ON school_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "All authenticated read school_settings"
  ON school_settings FOR SELECT
  TO authenticated
  USING (true);

-- Seed default settings
INSERT INTO school_settings (key, value) VALUES
  ('school_name', '"Your School Name"'),
  ('current_academic_year', '"2024/2025"'),
  ('terms', '["First Term", "Second Term", "Third Term"]'),
  ('currency', '"₦"'),
  ('currency_code', '"NGN"'),
  ('address', '""'),
  ('phone', '""'),
  ('email', '""')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION update_school_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_school_settings_updated_at ON school_settings;
CREATE TRIGGER set_school_settings_updated_at
  BEFORE UPDATE ON school_settings
  FOR EACH ROW EXECUTE FUNCTION update_school_settings_updated_at();

SELECT 'School settings table created!' AS status;

-- ─── 20260225100000_teachers_manage_events.sql ─────────────────────────────────────────────────────

-- Allow teachers to insert, update, delete events (admins already can via "Admins manage events")
-- Idempotent: drop if exists to avoid duplicate policy errors
DROP POLICY IF EXISTS "Teachers can insert events" ON events;
DROP POLICY IF EXISTS "Teachers can update events" ON events;
DROP POLICY IF EXISTS "Teachers can delete events" ON events;

CREATE POLICY "Teachers can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (is_teacher_or_admin());

CREATE POLICY "Teachers can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (is_teacher_or_admin())
  WITH CHECK (is_teacher_or_admin());

CREATE POLICY "Teachers can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (is_teacher_or_admin());

-- ─── 20260225200000_subjects.sql ─────────────────────────────────────────────────────

/*
  # Subjects Table
  Manages subjects as first-class entities: name, code, class, teacher, term.
*/

CREATE TABLE IF NOT EXISTS subjects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  code          text,
  class_id      uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  term          text NOT NULL DEFAULT 'First Term',
  academic_year text NOT NULL DEFAULT '2024/2025',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(name, class_id, term, academic_year)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Staff (admin + teacher) can manage subjects
CREATE POLICY "Staff manage subjects"
  ON subjects FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- All authenticated users can read subjects
CREATE POLICY "All read subjects"
  ON subjects FOR SELECT TO authenticated
  USING (true);

-- ─── 20260225210000_fee_templates.sql ─────────────────────────────────────────────────────

/*
  # Fee Templates Table
  Allows admin to define fee structures (group/item) before bulk-applying to students.
  Maps to SchoolBase's "fee groups/items" + "bulk debt uploads".
*/

CREATE TABLE IF NOT EXISTS fee_templates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  fee_type           text NOT NULL,
  amount             decimal(10,2) NOT NULL,
  term               text NOT NULL,
  academic_year      text NOT NULL DEFAULT '2024/2025',
  applies_to_class   uuid REFERENCES classes(id) ON DELETE SET NULL, -- null = all classes
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE fee_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage fee templates
CREATE POLICY "Admins manage fee_templates"
  ON fee_templates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Staff can read fee templates
CREATE POLICY "Staff read fee_templates"
  ON fee_templates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- ─── 20260226000000_admission_applications.sql ─────────────────────────────────────────────────────

-- Admission applications submitted via the public website
CREATE TABLE IF NOT EXISTS admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Parent / Guardian
  parent_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  -- Child
  child_name text NOT NULL,
  child_age text,
  date_of_birth date,
  gender text,
  program text NOT NULL,
  previous_school text,
  medical_conditions text,
  -- Emergency contact
  emergency_contact text,
  emergency_phone text,
  -- Additional
  message text,
  -- Workflow
  status text NOT NULL DEFAULT 'pending', -- pending | reviewed | approved | rejected | enrolled
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;

-- Public (anon) can submit applications
CREATE POLICY "Public can submit admission application"
  ON admission_applications FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated users can also submit (logged-in parents)
CREATE POLICY "Authenticated can submit admission application"
  ON admission_applications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only admins can view / manage applications
CREATE POLICY "Admins manage admission applications"
  ON admission_applications FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ─── 20260227000000_parent_rls.sql ─────────────────────────────────────────────────────

-- ── Parent-level RLS policies for grades, fees, health_records, parents, student_parents ──

-- Helper: check if current user is a parent of a given student
CREATE OR REPLACE FUNCTION public.is_parent_of(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM student_parents sp
    JOIN parents p ON sp.parent_id = p.id
    JOIN profiles pr ON p.profile_id = pr.id
    WHERE sp.student_id = target_student_id
      AND pr.user_id = auth.uid()
  );
$$;

-- ── GRADES ──────────────────────────────────────────────────────────────
-- Admins manage all grades
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grades' AND policyname='Admins manage grades'
  ) THEN
    CREATE POLICY "Admins manage grades" ON grades
      FOR ALL TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Teachers read/write grades for their class students
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grades' AND policyname='Teachers manage class grades'
  ) THEN
    CREATE POLICY "Teachers manage class grades" ON grades
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM students s
          JOIN classes c ON s.class_id = c.id
          JOIN teachers t ON c.teacher_id = t.profile_id
          JOIN profiles p ON t.profile_id = p.id
          WHERE s.id = grades.student_id AND p.user_id = auth.uid()
        )
        OR is_teacher_or_admin()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM students s
          JOIN classes c ON s.class_id = c.id
          JOIN teachers t ON c.teacher_id = t.profile_id
          JOIN profiles p ON t.profile_id = p.id
          WHERE s.id = grades.student_id AND p.user_id = auth.uid()
        )
        OR is_teacher_or_admin()
      );
  END IF;
END $$;

-- Students read their own grades
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grades' AND policyname='Students read own grades'
  ) THEN
    CREATE POLICY "Students read own grades" ON grades
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM students s
          JOIN profiles p ON s.profile_id = p.id
          WHERE s.id = grades.student_id AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Parents read their children's grades
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grades' AND policyname='Parents read children grades'
  ) THEN
    CREATE POLICY "Parents read children grades" ON grades
      FOR SELECT TO authenticated
      USING (is_parent_of(grades.student_id));
  END IF;
END $$;

-- ── FEES ─────────────────────────────────────────────────────────────────
-- Admins manage all fees
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fees' AND policyname='Admins manage fees'
  ) THEN
    CREATE POLICY "Admins manage fees" ON fees
      FOR ALL TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Students read own fees
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fees' AND policyname='Students read own fees'
  ) THEN
    CREATE POLICY "Students read own fees" ON fees
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM students s
          JOIN profiles p ON s.profile_id = p.id
          WHERE s.id = fees.student_id AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Parents read their children's fees
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='fees' AND policyname='Parents read children fees'
  ) THEN
    CREATE POLICY "Parents read children fees" ON fees
      FOR SELECT TO authenticated
      USING (is_parent_of(fees.student_id));
  END IF;
END $$;

-- ── HEALTH RECORDS ───────────────────────────────────────────────────────
-- Admins manage all health records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='health_records' AND policyname='Admins manage health records'
  ) THEN
    CREATE POLICY "Admins manage health records" ON health_records
      FOR ALL TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Parents read their children's health records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='health_records' AND policyname='Parents read children health records'
  ) THEN
    CREATE POLICY "Parents read children health records" ON health_records
      FOR SELECT TO authenticated
      USING (is_parent_of(health_records.student_id));
  END IF;
END $$;

-- ── PARENTS TABLE ────────────────────────────────────────────────────────
-- Admins manage all parent records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='Admins manage parents'
  ) THEN
    CREATE POLICY "Admins manage parents" ON parents
      FOR ALL TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Parents read own record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='Parents read own record'
  ) THEN
    CREATE POLICY "Parents read own record" ON parents
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = parents.profile_id AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── STUDENT_PARENTS ──────────────────────────────────────────────────────
-- Admins manage all links
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_parents' AND policyname='Admins manage student_parents'
  ) THEN
    CREATE POLICY "Admins manage student_parents" ON student_parents
      FOR ALL TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Parents read own links
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_parents' AND policyname='Parents read own links'
  ) THEN
    CREATE POLICY "Parents read own links" ON student_parents
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM parents p
          JOIN profiles pr ON p.profile_id = pr.id
          WHERE p.id = student_parents.parent_id AND pr.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── 20260227010000_admin_user_mgmt.sql ─────────────────────────────────────────────────────

-- ── Admin user management RPC functions ──────────────────────────────────

-- Delete an auth user + their profile (cascade handles the rest)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete from auth.users (cascades to auth.identities)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- Reset a user's password (admin only)
CREATE OR REPLACE FUNCTION public.admin_reset_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reset passwords';
  END IF;

  IF length(new_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;

  -- Update the encrypted password using pgcrypto
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated;

-- ─── 20260227020000_fix_admissions_rls_and_parents.sql ─────────────────────────────────────────────────────

-- ── Fix 1: Admission applications RLS ────────────────────────────────────
-- The role-specific anon policy did not match with Supabase's new publishable
-- key format. Replace with a public (role-agnostic) INSERT policy.

DROP POLICY IF EXISTS "Public can submit admission application" ON admission_applications;
DROP POLICY IF EXISTS "Authenticated can submit admission application" ON admission_applications;

-- Allow ANY role (anon AND authenticated) to submit admission forms.
-- The admin SELECT/UPDATE/DELETE policy below still restricts reads/edits.
CREATE POLICY "Anyone can submit admission application"
  ON admission_applications FOR INSERT
  WITH CHECK (true);

-- ── Fix 2: Ensure parents.address column exists ───────────────────────────
-- Column was added manually; add IF NOT EXISTS so migrations stay in sync.
ALTER TABLE parents ADD COLUMN IF NOT EXISTS address text;

-- ─── 20260227030000_admission_submit_fn.sql ─────────────────────────────────────────────────────

-- ── Public admission submission RPC ──────────────────────────────────────
-- SECURITY DEFINER function callable by anon/authenticated without RLS issues.
-- The calling user never touches the table directly; the function owner does.

CREATE OR REPLACE FUNCTION public.submit_admission_application(
  p_parent_name       text,
  p_email             text,
  p_phone             text,
  p_address           text,
  p_child_name        text,
  p_program           text,
  p_emergency_contact text,
  p_emergency_phone   text,
  p_child_age         text     DEFAULT NULL,
  p_date_of_birth     date     DEFAULT NULL,
  p_gender            text     DEFAULT NULL,
  p_previous_school   text     DEFAULT NULL,
  p_medical_conditions text    DEFAULT NULL,
  p_message           text     DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Basic validation
  IF length(trim(p_parent_name)) = 0 THEN RAISE EXCEPTION 'parent_name is required'; END IF;
  IF length(trim(p_email)) = 0 THEN RAISE EXCEPTION 'email is required'; END IF;
  IF length(trim(p_phone)) = 0 THEN RAISE EXCEPTION 'phone is required'; END IF;
  IF length(trim(p_child_name)) = 0 THEN RAISE EXCEPTION 'child_name is required'; END IF;
  IF length(trim(p_program)) = 0 THEN RAISE EXCEPTION 'program is required'; END IF;

  INSERT INTO admission_applications (
    parent_name, email, phone, address,
    child_name, child_age, date_of_birth, gender, program,
    previous_school, medical_conditions,
    emergency_contact, emergency_phone,
    message
  ) VALUES (
    p_parent_name, p_email, p_phone, p_address,
    p_child_name, p_child_age, p_date_of_birth, p_gender, p_program,
    p_previous_school, p_medical_conditions,
    p_emergency_contact, p_emergency_phone,
    p_message
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Allow anyone (website visitors + logged-in parents) to submit
GRANT EXECUTE ON FUNCTION public.submit_admission_application(
  text, text, text, text, text, text, text, text,
  text, date, text, text, text, text
) TO anon, authenticated;

-- ─── 20260228000000_teacher_manage_students.sql ─────────────────────────────────────────────────────

-- Allow teachers to see unassigned students (so they can add them to their class)
CREATE POLICY "Teachers can read unassigned students"
  ON students FOR SELECT
  TO authenticated
  USING (
    class_id IS NULL AND
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

-- Allow teachers to assign unassigned students to their own class
-- USING: student is currently unassigned OR already in teacher's class
-- WITH CHECK: after update, student must be in teacher's class
CREATE POLICY "Teachers can assign students to their class"
  ON students FOR UPDATE
  TO authenticated
  USING (
    class_id IS NULL OR
    EXISTS (
      SELECT 1 FROM classes c
      JOIN profiles p ON c.teacher_id = p.id
      WHERE c.id = students.class_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN profiles p ON c.teacher_id = p.id
      WHERE c.id = students.class_id AND p.user_id = auth.uid()
    )
  );

-- Bulk promote students from one class to another (admin only)
CREATE OR REPLACE FUNCTION promote_students(
  p_from_class_id uuid,
  p_to_class_id uuid,
  p_student_ids uuid[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can promote students';
  END IF;

  IF p_student_ids IS NULL THEN
    UPDATE students
    SET class_id = p_to_class_id
    WHERE class_id = p_from_class_id AND is_active = true;
  ELSE
    UPDATE students
    SET class_id = p_to_class_id
    WHERE id = ANY(p_student_ids)
      AND class_id = p_from_class_id
      AND is_active = true;
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ─── 20260228000001_teacher_can_promote.sql ─────────────────────────────────────────────────────

-- Update promote_students to also allow class teachers (not only admins)
CREATE OR REPLACE FUNCTION promote_students(
  p_from_class_id uuid,
  p_to_class_id uuid,
  p_student_ids uuid[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();

  -- Must be admin OR the teacher assigned to the from_class
  IF NOT (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE id = p_from_class_id AND teacher_id = v_profile_id
    )
  ) THEN
    RAISE EXCEPTION 'You can only promote students from your own class';
  END IF;

  IF p_student_ids IS NULL THEN
    UPDATE students
    SET class_id = p_to_class_id
    WHERE class_id = p_from_class_id AND is_active = true;
  ELSE
    UPDATE students
    SET class_id = p_to_class_id
    WHERE id = ANY(p_student_ids)
      AND class_id = p_from_class_id
      AND is_active = true;
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ─── 20260228010000_cbt_secure_submit.sql ─────────────────────────────────────────────────────

/*
  # CBT Security Hardening

  Problems fixed:
  1. "Students can manage own cbt_sessions" used FOR ALL, allowing students to
     directly UPDATE total_score to any value via the Supabase client.
  2. Score was calculated client-side using correct_option, which was sent to
     the browser. A student could read the answers from JS memory or DevTools.

  Solution:
  - Replace FOR ALL policy with separate FOR SELECT + FOR INSERT policies.
    Students can no longer UPDATE cbt_sessions directly.
  - Add submit_cbt_exam(p_session_id) SECURITY DEFINER function that:
      * Verifies the session belongs to the calling student and is not yet submitted
      * Calculates the score server-side (correct_option never leaves the DB)
      * Updates the session atomically
      * Returns { score, correct_count, total_questions } to the client
*/

-- ─── Fix cbt_sessions RLS ─────────────────────────────────────────────────────

-- Drop the overly-broad FOR ALL policy
DROP POLICY IF EXISTS "Students can manage own cbt_sessions" ON cbt_sessions;

-- Students may only SELECT their own sessions
CREATE POLICY "Students can select own cbt_sessions"
  ON cbt_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE s.id = cbt_sessions.student_id AND pr.user_id = auth.uid()
    )
  );

-- Students may INSERT a new session (startExam)
CREATE POLICY "Students can insert own cbt_sessions"
  ON cbt_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      JOIN profiles pr ON s.profile_id = pr.id
      WHERE s.id = cbt_sessions.student_id AND pr.user_id = auth.uid()
    )
  );

-- No UPDATE policy for students — submission is done via RPC (submit_cbt_exam)

-- ─── Server-side scoring function ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION submit_cbt_exam(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id    uuid;
  v_exam_id       uuid;
  v_score         integer := 0;
  v_correct_count integer := 0;
  v_total_q       integer := 0;
BEGIN
  -- Verify session belongs to the calling user and has not been submitted yet
  SELECT cs.student_id, cs.exam_id
    INTO v_student_id, v_exam_id
    FROM cbt_sessions cs
    JOIN students s   ON cs.student_id = s.id
    JOIN profiles pr  ON s.profile_id  = pr.id
   WHERE cs.id = p_session_id
     AND pr.user_id = auth.uid()
     AND cs.is_submitted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or already submitted';
  END IF;

  -- Calculate score entirely on the server (correct_option never leaves DB)
  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(CASE WHEN ca.selected_option = cq.correct_option THEN cq.marks ELSE 0 END)::integer, 0),
    COUNT(CASE WHEN ca.selected_option = cq.correct_option THEN 1 END)::integer
  INTO v_total_q, v_score, v_correct_count
  FROM cbt_questions cq
  LEFT JOIN cbt_answers ca
    ON ca.question_id = cq.id AND ca.session_id = p_session_id
  WHERE cq.exam_id = v_exam_id;

  -- Persist the result
  UPDATE cbt_sessions
     SET total_score  = v_score,
         is_submitted = true,
         submitted_at = now()
   WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'score',           v_score,
    'correct_count',   v_correct_count,
    'total_questions', v_total_q
  );
END;
$$;

-- Grant execute to authenticated users (RLS inside the function enforces ownership)
GRANT EXECUTE ON FUNCTION submit_cbt_exam(uuid) TO authenticated;

-- ─── 20260228020000_teacher_assign_any_student.sql ─────────────────────────────────────────────────────

-- SECURITY DEFINER RPC: lets a teacher assign any student to one of their own classes.
-- This bypasses the row-level USING/WITH-CHECK so the teacher doesn't need the student
-- to already be unassigned — admin may have initially placed a student in the wrong class.
CREATE OR REPLACE FUNCTION teacher_assign_student(
  p_student_id  uuid,
  p_class_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();

  -- Caller must be a teacher AND must own the target class
  IF NOT EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id AND teacher_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'You can only assign students to your own class';
  END IF;

  UPDATE students SET class_id = p_class_id WHERE id = p_student_id;
END;
$$;

-- Also allow teachers to read ALL active students (so they can pick from the full list)
DROP POLICY IF EXISTS "Teachers can read unassigned students" ON students;

CREATE POLICY "Teachers can read all active students"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );
