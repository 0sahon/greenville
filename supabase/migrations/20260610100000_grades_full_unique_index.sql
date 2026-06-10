-- Fix: replace two partial unique indexes with one full unique index.
-- ON CONFLICT (col...) cannot match partial indexes, causing the
-- "no unique or exclusion constraint" error when upserting grades.
DROP INDEX IF EXISTS grades_pre_kg_unique;
DROP INDEX IF EXISTS grades_academic_unique;

CREATE UNIQUE INDEX IF NOT EXISTS grades_unique_entry
  ON grades (student_id, subject, assessment_type, term, academic_year);
