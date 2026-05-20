-- Unique constraint to support upsert of pre_kg skill ratings
CREATE UNIQUE INDEX IF NOT EXISTS grades_pre_kg_unique
  ON grades (student_id, subject, assessment_type, term, academic_year)
  WHERE assessment_type = 'pre_kg';
