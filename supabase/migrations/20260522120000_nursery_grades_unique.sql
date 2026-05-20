-- Unique index for nursery and basic academic grade upsert support
-- Covers all assessment types except pre_kg (which has its own partial index)
CREATE UNIQUE INDEX IF NOT EXISTS grades_academic_unique
  ON grades (student_id, subject, assessment_type, term, academic_year)
  WHERE assessment_type != 'pre_kg';
