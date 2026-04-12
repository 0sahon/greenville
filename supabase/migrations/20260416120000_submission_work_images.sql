-- Submission photos: private storage + DB pointer. Teachers/admins grade, then client removes object and clears path.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS work_image_path text;

COMMENT ON COLUMN public.submissions.work_image_path IS
  'Object path inside storage bucket submission-work (first segment = auth user id who uploaded). Cleared after grading.';

-- Teachers/admins can update submissions for grading (score, feedback, status, clear image path)
DROP POLICY IF EXISTS "Teachers grade submissions" ON public.submissions;
CREATE POLICY "Teachers grade submissions"
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_teacher_or_admin())
  WITH CHECK (public.is_teacher_or_admin());

-- Private bucket for student work snapshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-work',
  'submission-work',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: path layout {auth.uid()}/{assignment_id}/work (no extension; content-type set on upload)
DROP POLICY IF EXISTS "submission_work_student_select" ON storage.objects;
CREATE POLICY "submission_work_student_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submission-work'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "submission_work_teacher_select" ON storage.objects;
CREATE POLICY "submission_work_teacher_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submission-work'
    AND public.is_teacher_or_admin()
  );

DROP POLICY IF EXISTS "submission_work_student_insert" ON storage.objects;
CREATE POLICY "submission_work_student_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submission-work'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "submission_work_student_update" ON storage.objects;
CREATE POLICY "submission_work_student_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'submission-work'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'submission-work'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "submission_work_student_delete" ON storage.objects;
CREATE POLICY "submission_work_student_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'submission-work'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "submission_work_teacher_delete" ON storage.objects;
CREATE POLICY "submission_work_teacher_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'submission-work'
    AND public.is_teacher_or_admin()
  );
