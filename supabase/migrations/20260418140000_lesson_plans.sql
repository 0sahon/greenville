-- Structured lesson plans per course (subject topic), with submit / approve workflow.

CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  lesson_date date,
  objectives text,
  activities text,
  materials_needed text,
  differentiation text,
  assessment text,
  reflection_notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_course ON public.lesson_plans(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON public.lesson_plans(teacher_profile_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_status ON public.lesson_plans(status);

COMMENT ON TABLE public.lesson_plans IS 'Per-topic structured plans; teachers submit, admins approve.';

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage lesson_plans"
  ON public.lesson_plans
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Teachers: own rows only (must own the linked course)
CREATE POLICY "Teachers manage own lesson_plans"
  ON public.lesson_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.id = lesson_plans.teacher_profile_id
    )
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_plans.course_id AND c.teacher_id = lesson_plans.teacher_profile_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.id = lesson_plans.teacher_profile_id
    )
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lesson_plans.course_id AND c.teacher_id = lesson_plans.teacher_profile_id
    )
  );

CREATE OR REPLACE FUNCTION public.set_lesson_plans_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_plans_updated_at ON public.lesson_plans;
CREATE TRIGGER trg_lesson_plans_updated_at
  BEFORE UPDATE ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_lesson_plans_updated_at();
