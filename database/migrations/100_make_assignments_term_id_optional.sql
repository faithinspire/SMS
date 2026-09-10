-- Migration 100: Make term_id optional in assignments
-- Teachers should be able to create assignments without selecting a term
-- term_id should be nullable

BEGIN;

-- ============================================================================
-- Make term_id nullable in assignments table
-- ============================================================================

-- Drop NOT NULL constraint if it exists
ALTER TABLE assignments 
  ALTER COLUMN term_id DROP NOT NULL;

-- ============================================================================
-- Summary: term_id is now optional in assignments
-- ============================================================================
-- Teachers can create assignments without assigning to a specific term
-- term_id will be NULL by default
-- term_id can be assigned later if needed
-- ============================================================================

COMMIT;
