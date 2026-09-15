-- Migration 115: Fix score_sheets term_id Foreign Key Reference
-- PURPOSE: Correct the FK constraint to point to academic_terms instead of obsolete terms table
-- ISSUE: score_sheets.term_id was referencing terms(id) but should reference academic_terms(id)

BEGIN;

-- ============================================================================
-- PHASE 1: DROP EXISTING FK CONSTRAINT (if it references wrong table)
-- ============================================================================

-- First, find and drop the incorrect FK constraint on term_id
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT constraint_name INTO constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'score_sheets' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%term_id%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE score_sheets DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- ============================================================================
-- PHASE 2: ADD CORRECT FK CONSTRAINT TO academic_terms
-- ============================================================================

-- Add FK constraint pointing to academic_terms
ALTER TABLE score_sheets 
ADD CONSTRAINT fk_score_sheets_academic_terms 
  FOREIGN KEY (term_id) 
  REFERENCES academic_terms(id) 
  ON DELETE CASCADE;

COMMIT;
