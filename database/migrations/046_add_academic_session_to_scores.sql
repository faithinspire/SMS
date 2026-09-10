-- ============================================================================
-- ADD ACADEMIC SESSION TRACKING TO SCORES
-- Migration to store academic_session alongside term_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE academic_sessions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL,  -- e.g., "2026/2027"
  name TEXT NOT NULL,                 -- e.g., "2026/2027 Academic Session"
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

-- ============================================================================
-- 2. ADD academic_session_id TO score_sheets TABLE
-- ============================================================================

ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS academic_session_id UUID 
  REFERENCES academic_sessions(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. ADD CREATED_AT TO score_sheets IF MISSING
-- ============================================================================

ALTER TABLE score_sheets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE 
  DEFAULT NOW();

-- ============================================================================
-- 4. UPDATE EXISTING score_sheets TO LINK TO DEFAULT SESSION
-- ============================================================================

-- Get or create default session for each school
DO $$
DECLARE
  school_record RECORD;
  session_id UUID;
BEGIN
  FOR school_record IN SELECT id FROM schools LOOP
    -- Check if default session exists
    SELECT id INTO session_id FROM academic_sessions 
    WHERE school_id = school_record.id 
    AND session_year = '2026/2027' 
    LIMIT 1;
    
    -- If not, create it
    IF session_id IS NULL THEN
      INSERT INTO academic_sessions (school_id, session_year, name, is_current)
      VALUES (
        school_record.id, 
        '2026/2027',
        '2026/2027 Academic Session',
        TRUE
      )
      ON CONFLICT (school_id, session_year) DO NOTHING
      RETURNING id INTO session_id;
    END IF;
    
    -- Update all existing score_sheets for this school to link to this session
    UPDATE score_sheets 
    SET academic_session_id = session_id
    WHERE school_id = school_record.id 
    AND academic_session_id IS NULL;
  END LOOP;
END $$;

-- ============================================================================
-- 5. CREATE INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_score_sheets_session ON score_sheets(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_score_sheets_session_term ON score_sheets(academic_session_id, term_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_current ON academic_sessions(school_id, is_current);

-- ============================================================================
-- 6. UPDATE UNIQUE CONSTRAINT TO INCLUDE academic_session
-- ============================================================================

-- Note: This would require dropping and recreating the constraint
-- For now, we rely on application logic to enforce uniqueness
-- Future: ALTER TABLE score_sheets DROP CONSTRAINT score_sheets_school_id_student_id_subject_id_term_id_key;
-- Future: ALTER TABLE score_sheets ADD UNIQUE(school_id, student_id, subject_id, academic_session_id, term_id);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- SELECT * FROM academic_sessions;
-- SELECT COUNT(*) FROM score_sheets WHERE academic_session_id IS NOT NULL;
-- SELECT DISTINCT academic_session_id FROM score_sheets;

