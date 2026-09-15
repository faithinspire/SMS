-- Migration 115: Fix score_sheets term_id Foreign Key Reference
-- PURPOSE: Correct the FK constraint to point to academic_terms instead of obsolete terms table
-- ISSUE: score_sheets.term_id was referencing terms(id) but should reference academic_terms(id)

BEGIN;

-- ============================================================================
-- PHASE 1: DROP EXISTING FK CONSTRAINTS (if they exist)
-- ============================================================================

-- Drop any existing term_id FK constraints (they may reference wrong table)
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS score_sheets_term_id_fkey;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_term;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_academic_terms;
ALTER TABLE score_sheets DROP CONSTRAINT IF EXISTS fk_score_sheets_terms;

-- ============================================================================
-- PHASE 2: ADD CORRECT FK CONSTRAINT TO academic_terms
-- ============================================================================

-- Add FK constraint pointing to academic_terms (the correct new table)
ALTER TABLE score_sheets 
ADD CONSTRAINT fk_score_sheets_academic_terms 
  FOREIGN KEY (term_id) 
  REFERENCES academic_terms(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMIT;
