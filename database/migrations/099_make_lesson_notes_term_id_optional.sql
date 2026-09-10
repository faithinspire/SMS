-- Migration 099: Make term_id optional in lesson_notes
-- Teachers should be able to create lesson notes without selecting a term
-- term_id should be nullable

BEGIN;

-- ============================================================================
-- Make term_id nullable in lesson_notes table
-- ============================================================================

-- Drop NOT NULL constraint if it exists
ALTER TABLE lesson_notes 
  ALTER COLUMN term_id DROP NOT NULL;

-- ============================================================================
-- Summary: term_id is now optional
-- ============================================================================
-- Teachers can create lesson notes without assigning to a specific term
-- term_id will be NULL by default
-- Headteacher can optionally assign term when reviewing
-- ============================================================================

COMMIT;
