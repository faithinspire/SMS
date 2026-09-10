-- ============================================================================
-- MIGRATION 051: Rebuild Academic Terms Schema
-- ============================================================================
--
-- PURPOSE: Restructure academic_terms table to use session_id as FK (not year INT).
-- This creates proper relational hierarchy: School → Session → Terms.
--
-- STRUCTURE:
-- academic_terms
--   id (UUID) - Primary Key
--   session_id (UUID) - Foreign Key to academic_sessions (NOT year INT)
--   school_id (UUID) - Foreign Key to schools (denormalized for query efficiency)
--   term_name (VARCHAR) - e.g., "First Term", "Second Term", "Third Term"
--   term_order (INT) - Display order (1, 2, 3)
--   start_date (DATE) - When this term starts
--   end_date (DATE) - When this term ends
--   is_active (BOOLEAN) - True if this is the current active term
--   created_at (TIMESTAMP)
--   updated_at (TIMESTAMP)
--   UNIQUE(session_id, term_name)
--   UNIQUE(session_id, term_order)
--
-- KEY POINTS:
-- 1. session_id is UUID (references academic_sessions.id)
-- 2. school_id is denormalized for efficient queries
-- 3. term_order ensures proper sorting (1=First, 2=Second, 3=Third)
-- 4. Each session can have unlimited term types (not hardcoded to 3)
-- 5. Historical terms are preserved (not deleted when session ends)
--
-- ============================================================================

-- Step 1: Rename old terms table to backup
ALTER TABLE IF EXISTS terms RENAME TO terms_backup;

-- Step 2: Create new academic_terms table with proper schema
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_name VARCHAR(100) NOT NULL,    -- e.g., "First Term", "Second Term"
  term_order INT NOT NULL,             -- Display order: 1, 2, 3, etc
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, term_name),
  UNIQUE(session_id, term_order),
  CHECK (end_date > start_date)
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_academic_terms_session 
  ON academic_terms(session_id);

CREATE INDEX IF NOT EXISTS idx_academic_terms_school 
  ON academic_terms(school_id);

CREATE INDEX IF NOT EXISTS idx_academic_terms_active 
  ON academic_terms(session_id, is_active);

CREATE INDEX IF NOT EXISTS idx_academic_terms_order 
  ON academic_terms(session_id, term_order);

CREATE INDEX IF NOT EXISTS idx_academic_terms_school_session 
  ON academic_terms(school_id, session_id);

-- Step 4: Migrate data from old terms table to new structure
-- Only migrate terms where matching session exists
INSERT INTO academic_terms (session_id, school_id, term_name, term_order, start_date, end_date, is_active)
SELECT 
  s.id as session_id,
  t.school_id,
  t.name as term_name,
  CASE 
    WHEN t.name = 'First Term' THEN 1
    WHEN t.name = 'Second Term' THEN 2
    WHEN t.name = 'Third Term' THEN 3
    ELSE 4
  END as term_order,
  t.start_date,
  t.end_date,
  t.is_current as is_active
FROM terms_backup t
JOIN academic_sessions s ON t.school_id = s.school_id 
  AND CAST(SUBSTRING(s.session_year, 1, 4) AS INT) = t.session_year
WHERE NOT EXISTS (
  SELECT 1 FROM academic_terms at2
  WHERE at2.session_id = s.id 
    AND at2.term_name = t.name
)
ON CONFLICT DO NOTHING;

-- Step 5: Drop old terms table
DROP TABLE IF EXISTS terms_backup CASCADE;

-- Step 6: Verify migration
SELECT 
  'ACADEMIC TERMS SCHEMA REBUILT' as status,
  COUNT(*) as total_terms,
  COUNT(DISTINCT session_id) as sessions_with_terms,
  COUNT(CASE WHEN is_active THEN 1 END) as active_terms
FROM academic_terms;

-- Step 7: Show sample data
SELECT 
  's.name as school,
  s.session_year as session,
  t.term_name as term,
  t.term_order as order,
  t.start_date,
  t.end_date
FROM academic_sessions s
JOIN academic_terms t ON s.id = t.session_id
ORDER BY s.start_year DESC, t.term_order ASC
LIMIT 15;
