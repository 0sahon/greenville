-- Break RLS recursion: classes policies that SELECT from students caused students policies
-- (which JOIN classes) to re-evaluate classes policies → infinite recursion.

DROP POLICY IF EXISTS "Parents can read child class" ON public.classes;
DROP POLICY IF EXISTS "Students can read own class" ON public.classes;

CREATE OR REPLACE FUNCTION public.user_can_read_class_for_student(class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.profiles pr ON s.profile_id = pr.id
    WHERE s.class_id = class_id AND pr.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_read_class_for_parent(class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.student_parents sp ON s.id = sp.student_id
    JOIN public.parents par ON sp.parent_id = par.id
    JOIN public.profiles pr ON par.profile_id = pr.id
    WHERE s.class_id = class_id AND pr.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_read_class_for_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_read_class_for_parent(uuid) TO authenticated;

CREATE POLICY "Parents can read child class"
  ON public.classes FOR SELECT TO authenticated
  USING (user_can_read_class_for_parent(id));

CREATE POLICY "Students can read own class"
  ON public.classes FOR SELECT TO authenticated
  USING (user_can_read_class_for_student(id));
