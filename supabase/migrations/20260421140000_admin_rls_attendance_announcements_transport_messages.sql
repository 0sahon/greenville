-- Attendance: teachers had FOR ALL; admins had no policy → admin seed upserts failed.
DROP POLICY IF EXISTS "Admins manage attendance" ON public.attendance;
CREATE POLICY "Admins manage attendance"
  ON public.attendance FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Announcements & transport: RLS was enabled with no policies → admin inserts failed (not recursion).
DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated read published announcements" ON public.announcements;

CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated read published announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (published = true);

DROP POLICY IF EXISTS "Admins manage transport" ON public.transport;
DROP POLICY IF EXISTS "Parents read child transport" ON public.transport;
DROP POLICY IF EXISTS "Students read own transport" ON public.transport;

CREATE POLICY "Admins manage transport"
  ON public.transport FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Parents read child transport"
  ON public.transport FOR SELECT TO authenticated
  USING (is_parent_of(student_id));

CREATE POLICY "Students read own transport"
  ON public.transport FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.profiles pr ON s.profile_id = pr.id
      WHERE s.id = transport.student_id AND pr.user_id = auth.uid()
    )
  );

-- Messages: bulk insert mixed admin + teacher senders while session is admin only.
-- Old WITH CHECK required sender_id = current user's profile for every row → teacher rows failed.
DROP POLICY IF EXISTS "Authenticated can send messages" ON public.messages;
CREATE POLICY "Authenticated can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND id = sender_id
    )
  );
