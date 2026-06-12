-- ─────────────────────────────────────────────────────────────────────────────
-- Normalize assessment_type to canonical forms, deduplicate, enforce integrity.
--
-- Canonical set (matches src/lib/assessmentTypes.ts):
--   '1st CA'   '2nd CA'   'Exam'   'Project'   'Homework'   'pre_kg'
--
-- Rule: core types have the exact capitalisation above; all other (custom)
-- teacher-entered types must be title-cased and trimmed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1 : map every known alias → canonical token ────────────────────────

UPDATE grades SET assessment_type = '1st CA'
WHERE lower(trim(assessment_type)) IN (
  '1st ca', 'first ca', '1stca', '1st continuous assessment'
);

UPDATE grades SET assessment_type = '2nd CA'
WHERE lower(trim(assessment_type)) IN (
  '2nd ca', 'second ca', '2ndca', '2nd continuous assessment'
);

UPDATE grades SET assessment_type = 'Exam'
WHERE lower(trim(assessment_type)) IN (
  'exam', 'examination', 'final exam', 'final examination'
);

UPDATE grades SET assessment_type = 'Project'
WHERE lower(trim(assessment_type)) = 'project';

UPDATE grades SET assessment_type = 'Homework'
WHERE lower(trim(assessment_type)) IN (
  'homework', 'home work', 'hw', 'assignment'
);

-- pre_kg stays exactly 'pre_kg' (observational model — not a scored component)
UPDATE grades SET assessment_type = 'pre_kg'
WHERE lower(trim(assessment_type)) IN ('pre_kg', 'pre kg', 'prekg');

-- ── Step 2 : title-case any remaining unrecognised custom types ──────────────
-- e.g. 'test' → 'Test',  'quiz' → 'Quiz',  'ca' → 'Ca'
UPDATE grades
SET    assessment_type =
         upper(substring(trim(assessment_type), 1, 1))
         || substring(lower(trim(assessment_type)), 2)
WHERE  assessment_type NOT IN ('1st CA', '2nd CA', 'Exam', 'Project', 'Homework', 'pre_kg')
  AND  assessment_type != trim(assessment_type)
       OR (
         assessment_type NOT IN ('1st CA', '2nd CA', 'Exam', 'Project', 'Homework', 'pre_kg')
         AND assessment_type != upper(substring(trim(assessment_type), 1, 1))
                                || substring(lower(trim(assessment_type)), 2)
       );

-- ── Step 3 : trim subject whitespace ────────────────────────────────────────
UPDATE grades
SET    subject = trim(subject)
WHERE  subject != trim(subject);

-- ── Step 4 : remove duplicates ───────────────────────────────────────────────
-- After normalisation some rows may share the same natural key.
-- Keep the one with the highest score; ties: most recent created_at.
DELETE FROM grades
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, subject, assessment_type, term, academic_year
        ORDER BY score DESC, created_at DESC
      ) AS rn
    FROM grades
  ) ranked
  WHERE rn > 1
);

-- ── Step 5 : rebuild unique index clean ─────────────────────────────────────
DROP INDEX IF EXISTS grades_unique_entry;
DROP INDEX IF EXISTS grades_academic_unique;
DROP INDEX IF EXISTS grades_pre_kg_unique;

CREATE UNIQUE INDEX grades_unique_entry
  ON grades (student_id, subject, assessment_type, term, academic_year);

-- ── Step 6 : DB-level integrity constraint ───────────────────────────────────
-- Core types must match exactly; any other type must be trimmed and
-- title-cased (first char uppercase, rest need not be lower — covers 'pre_kg').
ALTER TABLE grades
  DROP CONSTRAINT IF EXISTS grades_assessment_type_normalised;

ALTER TABLE grades
  ADD CONSTRAINT grades_assessment_type_normalised
  CHECK (
    assessment_type IN ('1st CA', '2nd CA', 'Exam', 'Project', 'Homework', 'pre_kg')
    OR (
      assessment_type = trim(assessment_type)
      AND length(assessment_type) > 0
      AND substring(assessment_type, 1, 1) = upper(substring(assessment_type, 1, 1))
    )
  );
