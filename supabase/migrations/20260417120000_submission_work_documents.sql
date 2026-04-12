-- Uploaded documents (PDF, Office, etc.) alongside photos; same bucket + RLS path prefix.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS work_document_path text;

COMMENT ON COLUMN public.submissions.work_document_path IS
  'Object path for student-uploaded document in bucket submission-work (path …/document). Cleared after grading.';

-- Allow larger files and common document MIME types (same bucket as photos).
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/rtf',
    'application/octet-stream'
  ]
WHERE id = 'submission-work';
