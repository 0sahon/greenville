-- Remove the 'basic6' enum value from class_level.
-- The school no longer uses Basic 6 (Primary 6 students roll into JSS1 externally).
-- Any existing classes with level='basic6' are reassigned to 'basic5'.
--
-- PostgreSQL cannot DROP a value from an existing enum directly, so we:
--   1. Migrate existing data
--   2. Rename the old type
--   3. Create a fresh type without basic6
--   4. Alter the column to use the new type
--   5. Drop the old type
--
-- Apply with: supabase db push  OR  psql -f this_file

BEGIN;

-- 1. Reassign any existing basic6 classes to basic5
UPDATE classes SET level = 'basic5' WHERE level = 'basic6';

-- 2. Rename old enum so we can recreate the name
ALTER TYPE class_level RENAME TO class_level_old;

-- 3. New enum without basic6 (preserve insertion order for readability)
CREATE TYPE class_level AS ENUM (
  'creche',
  'toddler',
  'basic1',
  'basic2',
  'basic3',
  'basic4',
  'basic5'
);

-- 4. Migrate the classes.level column
ALTER TABLE classes
  ALTER COLUMN level TYPE class_level
  USING level::text::class_level;

-- 5. Drop old enum
DROP TYPE class_level_old;

COMMIT;
