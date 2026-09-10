-- ============================================================================
-- MIGRATION 068: Add option_key column to cbt_options
-- ============================================================================
-- Adds the missing option_key column that stores A, B, C, D for options
-- ============================================================================

BEGIN;

-- Add option_key column if it doesn't exist
ALTER TABLE cbt_options
ADD COLUMN IF NOT EXISTS option_key VARCHAR(1) DEFAULT 'A';

-- Populate option_key based on display_order
UPDATE cbt_options 
SET option_key = CASE 
  WHEN display_order = 0 THEN 'A'
  WHEN display_order = 1 THEN 'B'
  WHEN display_order = 2 THEN 'C'
  WHEN display_order = 3 THEN 'D'
  ELSE 'A'  -- Default to A for any other display order
END
WHERE option_key IS NULL OR option_key = 'A';

COMMIT;
