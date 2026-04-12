-- Keep public.profiles in sync with auth.users: one row per auth user, role from signup metadata.
-- Also extend admin_create_user with profile_role (stored in raw_user_meta_data.app_role for the trigger).

-- One logical profile per auth user (enables ON CONFLICT and prevents duplicate rows).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.user_role := 'parent'::public.user_role;
  ar text;
BEGIN
  ar := COALESCE(NEW.raw_user_meta_data->>'app_role', '');
  IF ar IN ('admin', 'teacher', 'parent', 'student') THEN
    r := ar::public.user_role;
  END IF;

  INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    r
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email       = EXCLUDED.email,
    first_name  = EXCLUDED.first_name,
    last_name   = EXCLUDED.last_name,
    role        = EXCLUDED.role,
    updated_at  = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates/updates public.profiles when auth.users row is inserted; reads app_role + names from raw_user_meta_data.';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- admin_create_user: include app_role in metadata so handle_new_user sets profiles.role in the same transaction.
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email       text,
  user_password    text,
  user_first_name  text,
  user_last_name   text,
  profile_role     public.user_role DEFAULT 'parent'::public.user_role
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
      'last_name',  user_last_name,
      'app_role',   profile_role::text
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

GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, public.user_role) TO authenticated;
