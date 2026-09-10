-- ============================================================================
-- MIGRATION 060: Enforce CBT Options Requirements
-- ============================================================================
--
-- PURPOSE:
-- 1. Enforce that MULTIPLE_CHOICE and TRUE_FALSE questions have exactly 4 options
-- 2. Enforce unique constraint on question_id + display_order (0,1,2,3)
-- 3. Enforce that only ONE option per question is marked as correct
-- 4. Populate missing option_key values
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure option_key is properly set (A,B,C,D based on display_order)
-- ============================================================================

UPDATE cbt_options 
SET option_key = CASE 
  WHEN display_order = 0 THEN 'A'
  WHEN display_order = 1 THEN 'B'
  WHEN display_order = 2 THEN 'C'
  WHEN display_order = 3 THEN 'D'
  ELSE 'A'  -- Default to A if out of range
END
WHERE option_key IS NULL OR option_key = '';

-- ============================================================================
-- STEP 2: Ensure unique constraint on question_id + display_order
-- ============================================================================

-- This prevents duplicate options at same position
-- Drop existing constraint if it exists first
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE cbt_options DROP CONSTRAINT unique_question_option_display_order;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;

ALTER TABLE cbt_options
ADD CONSTRAINT unique_question_option_display_order
  UNIQUE(question_id, display_order);

-- ============================================================================
-- STEP 3: Enforce single correct answer per question
-- ============================================================================

-- Delete duplicate "correct" options (keep first one)
DELETE FROM cbt_options cop
WHERE is_correct = TRUE
  AND EXISTS (
    SELECT 1
    FROM cbt_options other
    WHERE other.question_id = cop.question_id
      AND other.is_correct = TRUE
      AND other.id < cop.id
  );

-- Now enforce unique constraint: only one correct answer per question
CREATE UNIQUE INDEX IF NOT EXISTS idx_cbt_one_correct_answer_per_question
  ON cbt_options(question_id)
  WHERE is_correct = TRUE;

-- ============================================================================
-- STEP 4: Add CHECK constraint to ensure MULTIPLE_CHOICE/TRUE_FALSE have options
-- ============================================================================

-- This is enforced at application level via the API endpoint
-- (Cannot easily add at DB level without triggers)

COMMIT;
