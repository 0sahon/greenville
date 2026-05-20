-- Subject visibility settings — controls which subjects appear on printed report cards
CREATE TABLE IF NOT EXISTS subject_settings (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  level_group  text    NOT NULL CHECK (level_group IN ('basic', 'nursery')),
  subject      text    NOT NULL,
  is_visible   boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  UNIQUE (level_group, subject)
);

ALTER TABLE subject_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "subject_settings_read" ON subject_settings
  FOR SELECT TO authenticated USING (true);

-- Only admins can write
CREATE POLICY "subject_settings_admin_write" ON subject_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed Basic subjects
INSERT INTO subject_settings (level_group, subject, sort_order, is_visible) VALUES
  ('basic', 'English Language/Verbal Reasoning', 1, true),
  ('basic', 'Mathematics/Quantitative',          2, true),
  ('basic', 'Basic Science',                     3, true),
  ('basic', 'Religion & National Values',        4, true),
  ('basic', 'Agricultural Science',              5, true),
  ('basic', 'Phonics',                           6, true),
  ('basic', 'Home Economics',                    7, true),
  ('basic', 'Cultural Subject',                  8, true),
  ('basic', 'Entrepreneurship Development',      9, true),
  ('basic', 'Computer Science',                 10, true),
  ('basic', 'Handwriting',                      11, true),
  ('basic', 'French',                           12, true),
  ('basic', 'Music',                            13, true),
  ('basic', 'Physical and Health Education',    14, true),
  ('basic', 'Coding',                           15, true)
ON CONFLICT (level_group, subject) DO NOTHING;

-- Seed Nursery subjects
INSERT INTO subject_settings (level_group, subject, sort_order, is_visible) VALUES
  ('nursery', 'English Language',        1, true),
  ('nursery', 'Mathematics',             2, true),
  ('nursery', 'Phonics',                 3, true),
  ('nursery', 'Basic Science',           4, true),
  ('nursery', 'Social Studies',          5, true),
  ('nursery', 'Cultural and Creative',   6, true),
  ('nursery', 'Physical Education',      7, true),
  ('nursery', 'French',                  8, true),
  ('nursery', 'Practice Life Exercise',  9, true),
  ('nursery', 'Sensorial',              10, true),
  ('nursery', 'General Science',        11, true),
  ('nursery', 'Coding',                 12, true)
ON CONFLICT (level_group, subject) DO NOTHING;
