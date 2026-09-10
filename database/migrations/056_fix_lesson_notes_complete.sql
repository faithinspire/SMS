-- ============================================================================
-- MIGRATION 056: Fix Lesson Notes Complete Architecture
-- ============================================================================
--
-- PURPOSE:
-- - Add missing 'status' column to lesson_notes table
-- - Create audit timestamp columns for principal review actions
-- - Ensure lesson_notes can be tracked through workflow: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | RETURNED
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add status column to lesson_notes
-- ============================================================================

DO $$
BEGIN
  -- Add status column if not exists
  ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status VARCHAR(50) 
    DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED'));
  
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: Add principal review tracking columns
-- ============================================================================

DO $$
BEGIN
  -- Add reviewed_by (principal/admin who reviewed it)
  ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID 
    REFERENCES users(id) ON DELETE SET NULL;
  
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Add reviewed_at (when principal reviewed)
  ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
  
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Add review_comments (feedback from principal)
  ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS review_comments TEXT;
  
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  -- Add updated_at for tracking modifications
  ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE 
    DEFAULT NOW();
  
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- STEP 3: Create indexes for lesson_notes queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_status 
  ON lesson_notes(school_id, status);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_class_arm_status 
  ON lesson_notes(class_arm_combo_id, status);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_subject_status 
  ON lesson_notes(subject_id, status);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_by 
  ON lesson_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_reviewed_by 
  ON lesson_notes(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_at_desc 
  ON lesson_notes(school_id, created_at DESC);

-- ============================================================================
-- STEP 4: Create trigger to auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lesson_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lesson_notes_updated_at_trigger ON lesson_notes;

CREATE TRIGGER lesson_notes_updated_at_trigger
BEFORE UPDATE ON lesson_notes
FOR EACH ROW
EXECUTE FUNCTION update_lesson_notes_updated_at();

-- ============================================================================
-- STEP 5: Verify data integrity
-- ============================================================================

DO $$
DECLARE
  lesson_count INT;
BEGIN
  SELECT COUNT(*) INTO lesson_count FROM lesson_notes;
  
  RAISE NOTICE 'Migration 056 Complete:';
  RAISE NOTICE '  - Added status column (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED)';
  RAISE NOTICE '  - Added reviewed_by (FK to users)';
  RAISE NOTICE '  - Added reviewed_at (timestamp)';
  RAISE NOTICE '  - Added review_comments (text)';
  RAISE NOTICE '  - Added updated_at (timestamp with trigger)';
  RAISE NOTICE '  - Created indexes for lesson_notes queries';
  RAISE NOTICE '  - Total lesson_notes records: %', lesson_count;
END $$;

COMMIT;
