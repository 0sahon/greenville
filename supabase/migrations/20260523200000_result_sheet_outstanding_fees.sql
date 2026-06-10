-- Add outstanding_fees column to result_sheets for printing on report cards
ALTER TABLE result_sheets ADD COLUMN IF NOT EXISTS outstanding_fees TEXT DEFAULT '';
