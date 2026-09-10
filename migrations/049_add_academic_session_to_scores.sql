-- Migration 049: Add academic session tracking to score sheets
-- Purpose: Enable filtering of results by academic session (2026/2027, 2027/2028, etc.)
-- Date: 2026-08-28

-- Step 1: Create academic_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_string TEXT NOT NULL, -- Format: "2026/2027"
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, session_string)
);

-- Step 2: Create index for common queries
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_current 
  ON academic_sessions(school_id, is_current);

-- Step 3: Add academic_session_id column to score_sheets if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'score_sheets' 
    AND column_name = 'academic_session_id'
  ) THEN
    ALTER TABLE score_sheets 
    ADD COLUMN academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_score_sheets_academic_session 
      ON score_sheets(academic_session_id);
  END IF;
END $$;

-- Step 4: Add session_year column as backup (for quick session filtering)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'score_sheets' 
    AND column_name = 'session_year'
  ) THEN
    ALTER TABLE score_sheets 
    ADD COLUMN session_year TEXT; -- Format: "2026/2027"
  END IF;
END $$;

-- Step 5: Enable RLS on academic_sessions
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Schools can read their sessions" ON academic_sessions;
  DROP POLICY IF EXISTS "School admins can manage sessions" ON academic_sessions;
  
  -- Anyone can read sessions for their school
  CREATE POLICY "Schools can read their sessions"
    ON academic_sessions
    FOR SELECT
    USING (school_id = auth.jwt()->'school_id'::UUID OR auth.role() = 'service_role');
  
  -- Admins can manage sessions
  CREATE POLICY "School admins can manage sessions"
    ON academic_sessions
    FOR ALL
    USING (
      school_id = auth.jwt()->'school_id'::UUID 
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'HEAD_TEACHER')
    )
    WITH CHECK (
      school_id = auth.jwt()->'school_id'::UUID 
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('PRINCIPAL', 'SCHOOL_ADMIN', 'HEAD_TEACHER')
    );
END $$;

-- Step 7: Populate default sessions for existing schools
-- (This is typically done during school setup, but ensure coverage)
INSERT INTO academic_sessions (school_id, session_string, start_year, end_year, is_current)
SELECT 
  s.id,
  '2026/2027',
  2026,
  2027,
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions 
  WHERE school_id = s.id 
  AND session_string = '2026/2027'
);

-- Step 8: Grant permissions
GRANT SELECT ON academic_sessions TO authenticated;
GRANT INSERT, UPDATE ON academic_sessions TO authenticated;

-- Confirm migration
SELECT 'Migration 049 completed successfully' AS status;
