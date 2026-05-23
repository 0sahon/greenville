-- Add report_pin column for parent result portal access
ALTER TABLE students ADD COLUMN IF NOT EXISTS report_pin VARCHAR(8);

-- Fix legacy QFS- prefix to GMS- (one-time data fix)
UPDATE students
SET student_id = REPLACE(student_id, 'QFS-', 'GMS-')
WHERE student_id LIKE 'QFS-%';

-- RPC: verify student PIN and return published result data (SECURITY DEFINER = callable by anon)
CREATE OR REPLACE FUNCTION get_student_portal_data(
  p_student_display_id TEXT,
  p_pin                TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student  RECORD;
  v_sheets   JSON;
  v_result   JSON;
BEGIN
  -- Look up student by display ID and PIN
  SELECT s.id, s.student_id, s.gender, s.date_of_birth, s.report_pin,
         p.first_name, p.last_name,
         c.name  AS class_name,
         c.level AS class_level
  INTO   v_student
  FROM   students  s
  JOIN   profiles  p ON p.id = s.profile_id
  JOIN   classes   c ON c.id = s.class_id
  WHERE  UPPER(s.student_id) = UPPER(p_student_display_id)
    AND  s.report_pin = p_pin
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Gather published result sheets + grades
  SELECT json_agg(sheet_row ORDER BY sheet_row.academic_year DESC, sheet_row.term)
  INTO   v_sheets
  FROM (
    SELECT
      rs.term,
      rs.academic_year,
      rs.teacher_comment,
      rs.principal_comment,
      rs.punctuality,
      rs.neatness,
      rs.honesty,
      rs.cooperation,
      rs.attentiveness,
      rs.politeness,
      rs.days_present,
      rs.days_absent,
      rs.total_school_days,
      rs.next_term_begins,
      rs.next_term_fees,
      (
        SELECT json_agg(json_build_object(
          'subject',         g.subject,
          'assessment_type', g.assessment_type,
          'score',           g.score,
          'max_score',       g.max_score
        ))
        FROM grades g
        WHERE g.student_id     = v_student.id
          AND g.term           = rs.term
          AND g.academic_year  = rs.academic_year
      ) AS grades
    FROM result_sheets rs
    WHERE rs.student_id   = v_student.id
      AND rs.is_published = TRUE
  ) sheet_row;

  -- Build response
  SELECT json_build_object(
    'student', json_build_object(
      'id',            v_student.id,
      'student_id',    v_student.student_id,
      'first_name',    v_student.first_name,
      'last_name',     v_student.last_name,
      'class_name',    v_student.class_name,
      'class_level',   v_student.class_level,
      'gender',        v_student.gender,
      'date_of_birth', v_student.date_of_birth
    ),
    'sheets', v_sheets
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Allow unauthenticated (anon) callers to invoke this function
GRANT EXECUTE ON FUNCTION get_student_portal_data(TEXT, TEXT) TO anon;
