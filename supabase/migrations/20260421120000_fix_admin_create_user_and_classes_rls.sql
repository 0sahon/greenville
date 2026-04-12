-- Fix admin_create_user: search_path = public hides pgcrypto; use extensions schema (matches admin_reset_password).
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
  SELECT p.role INTO caller_role
  FROM profiles p
  WHERE p.user_id = auth.uid();

  IF caller_role IS DISTINCT FROM 'admin'::user_role THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(user_email)) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  new_user_id := gen_random_uuid();

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
    extensions.crypt(user_password, extensions.gen_salt('bf')),
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

-- classes had RLS with no policies → inserts denied. Idempotent policy names.
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can read classes they teach" ON public.classes;
DROP POLICY IF EXISTS "Parents can read child class" ON public.classes;
DROP POLICY IF EXISTS "Students can read own class" ON public.classes;

CREATE POLICY "Admins can manage classes"
  ON public.classes FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Teachers can read classes they teach"
  ON public.classes FOR SELECT TO authenticated
  USING (
    teacher_id IS NOT NULL
    AND teacher_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can read child class"
  ON public.classes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.student_parents sp ON s.id = sp.student_id
      JOIN public.parents par ON sp.parent_id = par.id
      JOIN public.profiles pr ON par.profile_id = pr.id
      WHERE s.class_id = classes.id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can read own class"
  ON public.classes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.profiles pr ON s.profile_id = pr.id
      WHERE s.class_id = classes.id AND pr.user_id = auth.uid()
    )
  );

-- teachers had RLS with no policies → admin could not insert teacher rows via API.
DROP POLICY IF EXISTS "Admins manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teachers read own teacher row" ON public.teachers;

CREATE POLICY "Admins manage teachers"
  ON public.teachers FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Teachers read own teacher row"
  ON public.teachers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = teachers.profile_id AND p.user_id = auth.uid()
    )
  );
