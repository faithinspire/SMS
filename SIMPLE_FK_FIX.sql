-- ============================================================================
-- SIMPLE FOREIGN KEY FIX - Copy and paste this ENTIRE block
-- ============================================================================
-- This fixes the "violates foreign key constraint" error when saving scores
-- ============================================================================

-- Step 1: Find and drop old constraint
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT constraint_name INTO fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'score_sheets'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%term%';
  
  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE score_sheets DROP CONSTRAINT ' || fk_name;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 2: Add new constraint to academic_terms
ALTER TABLE score_sheets
ADD CONSTRAINT fk_score_sheets_term_id_academic_terms
FOREIGN KEY (term_id) 
REFERENCES academic_terms(id) 
ON DELETE CASCADE;

-- Step 3: Verify the constraint
SELECT 
  kcu.constraint_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id';

-- ============================================================================
-- Expected output above:
-- constraint_name: fk_score_sheets_term_id_academic_terms
-- foreign_table_name: academic_terms
-- delete_rule: CASCADE
-- ============================================================================
