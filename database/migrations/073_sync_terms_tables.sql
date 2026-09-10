-- ============================================================================
-- Migration 073: Sync Terms Tables
-- The cbt_exams table references the old 'terms' table, but we're now using
-- 'academic_terms'. This migration syncs them.
-- ============================================================================

-- Step 1: Ensure old terms table exists
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year, name)
);

-- Step 2: Populate old terms table from academic_terms if it's empty
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current, id)
SELECT 
  at.school_id,
  at.term_name as name,
  EXTRACT(YEAR FROM COALESCE(at.start_date, NOW()))::INT as session_year,
  COALESCE(at.start_date, NOW()::DATE) as start_date,
  COALESCE(at.end_date, (NOW() + INTERVAL '3 months')::DATE) as end_date,
  at.is_active as is_current,
  at.id
FROM academic_terms at
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.school_id = at.school_id 
  AND t.name = at.term_name
)
ON CONFLICT (school_id, session_year, name) DO NOTHING;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_terms_school_id ON terms(school_id);
CREATE INDEX IF NOT EXISTS idx_terms_session_year ON terms(session_year);
CREATE INDEX IF NOT EXISTS idx_terms_is_current ON terms(is_current);

-- Step 4: Verify cbt_exams foreign key
-- If there are orphaned cbt_exams records, try to fix them by linking to terms
UPDATE cbt_exams ce
SET term_id = t.id
FROM terms t
WHERE ce.term_id IS NULL
  AND t.school_id = ce.school_id
  AND t.is_current = true
  AND NOT EXISTS (
    SELECT 1 FROM terms t2
    WHERE t2.id = ce.term_id
  );

COMMIT;
