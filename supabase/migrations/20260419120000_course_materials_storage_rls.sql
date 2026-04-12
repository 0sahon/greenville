-- Class materials: optional file in Storage + strict RLS (no global read-all).

ALTER TABLE public.course_materials
  ADD COLUMN IF NOT EXISTS file_storage_path text;

COMMENT ON COLUMN public.course_materials.file_storage_path IS
  'Path in bucket course-materials (layout auth.uid()/course_id/uuid). Signed URL in app.';

-- Who may read a material row (admin, course teacher, enrolled student, linked parent)
CREATE OR REPLACE FUNCTION public.user_can_access_course_for_materials(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = p_course_id
        AND c.teacher_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    )
    OR EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.courses c ON c.id = p_course_id
      WHERE s.profile_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND s.class_id IS NOT NULL
        AND (
          c.class_id IS NOT DISTINCT FROM s.class_id
          OR (
            c.class_id IS NULL
            AND EXISTS (
              SELECT 1 FROM public.classes cl
              WHERE cl.id = s.class_id AND cl.teacher_id = c.teacher_id
            )
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_parents sp
      JOIN public.parents par ON par.id = sp.parent_id
      JOIN public.students s ON s.id = sp.student_id
      JOIN public.courses c ON c.id = p_course_id
      WHERE par.profile_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND s.class_id IS NOT NULL
        AND (
          c.class_id IS NOT DISTINCT FROM s.class_id
          OR (
            c.class_id IS NULL
            AND EXISTS (
              SELECT 1 FROM public.classes cl
              WHERE cl.id = s.class_id AND cl.teacher_id = c.teacher_id
            )
          )
        )
    );
$$;

-- Replace course_materials policies
DROP POLICY IF EXISTS "All authenticated read materials" ON public.course_materials;
DROP POLICY IF EXISTS "Teachers manage materials" ON public.course_materials;
DROP POLICY IF EXISTS "Admins manage materials" ON public.course_materials;

CREATE POLICY "Admins manage materials"
  ON public.course_materials
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "course_materials_select_if_course_accessible"
  ON public.course_materials
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_course_for_materials(course_id));

CREATE POLICY "course_materials_teacher_insert"
  ON public.course_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_materials.course_id
        AND c.teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "course_materials_teacher_update"
  ON public.course_materials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_materials.course_id
        AND c.teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_materials.course_id
        AND c.teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "course_materials_teacher_delete"
  ON public.course_materials
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_materials.course_id
        AND c.teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Private bucket for uploaded class files (PDF, video, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "course_materials_storage_read" ON storage.objects;
CREATE POLICY "course_materials_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.course_materials m
        WHERE m.file_storage_path = storage.objects.name
          AND public.user_can_access_course_for_materials(m.course_id)
      )
    )
  );

DROP POLICY IF EXISTS "course_materials_storage_insert" ON storage.objects;
CREATE POLICY "course_materials_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "course_materials_storage_update" ON storage.objects;
CREATE POLICY "course_materials_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'course-materials'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "course_materials_storage_delete" ON storage.objects;
CREATE POLICY "course_materials_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.is_admin()
    )
  );
