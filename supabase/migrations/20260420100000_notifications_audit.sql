-- In-app notifications, inspection audit log, and triggers for lesson plans / materials.

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  link_kind text,
  link_id uuid
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_profile ON public.in_app_notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_unread ON public.in_app_notifications(profile_id) WHERE read_at IS NULL;

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.in_app_notifications FOR SELECT TO authenticated
  USING (profile_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users update own notifications"
  ON public.in_app_notifications FOR UPDATE TO authenticated
  USING (profile_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1))
  WITH CHECK (profile_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));

COMMENT ON TABLE public.in_app_notifications IS 'Per-profile inbox; rows inserted by SECURITY DEFINER triggers.';

-- ─── Audit trail (admin-readable) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created ON public.audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit_events"
  ON public.audit_events FOR SELECT TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.audit_events IS 'Append-only inspection log; writes via triggers / definer functions.';

-- ─── Notify helpers (SECURITY DEFINER) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public._notify_admins_lesson_plan_submitted(p_plan public.lesson_plans)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subj text;
BEGIN
  SELECT c.subject || ' — ' || c.title INTO subj
  FROM public.courses c WHERE c.id = p_plan.course_id;
  INSERT INTO public.in_app_notifications (profile_id, title, body, type, link_kind, link_id)
  SELECT pr.id,
    'Lesson plan pending review',
    COALESCE(subj, p_plan.title) || E'\n' || p_plan.title,
    'lesson_plan_admin',
    'lesson_plan',
    p_plan.id
  FROM public.profiles pr
  WHERE pr.role::text = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public._notify_teacher_lesson_plan_decision(p_plan public.lesson_plans)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  b text;
BEGIN
  IF p_plan.status = 'approved' THEN
    t := 'Lesson plan approved';
    b := COALESCE(p_plan.title, 'Your plan') || ' was approved.';
  ELSE
    t := 'Lesson plan needs revision';
    b := COALESCE(p_plan.review_note, 'Please review admin feedback and resubmit.');
  END IF;
  INSERT INTO public.in_app_notifications (profile_id, title, body, type, link_kind, link_id)
  VALUES (p_plan.teacher_profile_id, t, b, 'lesson_plan_teacher', 'lesson_plan', p_plan.id);
END;
$$;

CREATE OR REPLACE FUNCTION public._audit_lesson_plan_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aid uuid;
  act text;
  det jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'lesson_plan.create';
    aid := NEW.teacher_profile_id;
    det := jsonb_build_object('status', NEW.status, 'title', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      act := 'lesson_plan.status';
      aid := COALESCE(NEW.reviewed_by, NEW.teacher_profile_id);
      det := jsonb_build_object('from', OLD.status, 'to', NEW.status, 'title', NEW.title, 'review_note', NEW.review_note);
    ELSE
      act := 'lesson_plan.update';
      aid := NEW.teacher_profile_id;
      det := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_events (actor_profile_id, action, entity_type, entity_id, details)
  VALUES (aid, act, 'lesson_plan', NEW.id, det);

  -- In-app notifications
  IF TG_OP = 'INSERT' AND NEW.status = 'submitted' THEN
    PERFORM public._notify_admins_lesson_plan_submitted(NEW);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    PERFORM public._notify_admins_lesson_plan_submitted(NEW);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'submitted' AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM public._notify_teacher_lesson_plan_decision(NEW);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_plans_audit_notify ON public.lesson_plans;
CREATE TRIGGER trg_lesson_plans_audit_notify
  AFTER INSERT OR UPDATE ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public._audit_lesson_plan_row();

-- course_materials audit (INSERT / UPDATE / DELETE)
CREATE OR REPLACE FUNCTION public._audit_course_materials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aid uuid;
  eid uuid;
  act text;
  det jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    act := 'course_material.delete';
    aid := OLD.uploaded_by;
    eid := OLD.id;
    det := jsonb_build_object('title', OLD.title, 'course_id', OLD.course_id);
    INSERT INTO public.audit_events (actor_profile_id, action, entity_type, entity_id, details)
    VALUES (aid, act, 'course_material', eid, det);
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    act := 'course_material.create';
    aid := NEW.uploaded_by;
    eid := NEW.id;
    det := jsonb_build_object('title', NEW.title, 'course_id', NEW.course_id);
  ELSE
    act := 'course_material.update';
    aid := NEW.uploaded_by;
    eid := NEW.id;
    det := jsonb_build_object('title', NEW.title, 'course_id', NEW.course_id);
  END IF;
  INSERT INTO public.audit_events (actor_profile_id, action, entity_type, entity_id, details)
  VALUES (aid, act, 'course_material', eid, det);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_materials_audit ON public.course_materials;
CREATE TRIGGER trg_course_materials_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.course_materials
  FOR EACH ROW EXECUTE FUNCTION public._audit_course_materials();
