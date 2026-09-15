-- Migration 112: Diagnostic and Populate Sessions
-- PURPOSE: 
-- 1. Check if academic_sessions table exists with correct schema
-- 2. Check if academic_terms table exists with correct schema
-- 3. Verify data exists for all schools
-- 4. Safely populate sessions/terms if missing
-- 5. Log diagnostic information

BEGIN;

-- ============================================================================
-- STEP 1: Verify academic_sessions table exists with correct schema
-- ============================================================================

-- Ensure table exists with correct columns
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL,
  start_year INT,
  end_year INT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

-- Add any missing columns safely
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS start_year INT;
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS end_year INT;
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: Verify academic_terms table exists with correct schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term_name VARCHAR(100) NOT NULL,
  term_order INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, term_name),
  UNIQUE(session_id, term_order),
  CHECK (end_date > start_date)
);

-- Add any missing columns safely
DO $$
BEGIN
  ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE;
  ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS term_order INT;
  ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS start_date DATE;
  ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS end_date DATE;
  ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
  ALTER TABLE academic_terms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- STEP 3: Populate sessions if none exist
-- ============================================================================

-- For each school that has NO sessions, create them
WITH schools_needing_sessions AS (
  SELECT DISTINCT s.id
  FROM schools s
  LEFT JOIN academic_sessions a ON s.id = a.school_id
  WHERE a.id IS NULL -- No academic sessions exist for this school
)
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active, created_at)
SELECT 
  s.id as school_id,
  y.year_val || '/' || (y.year_val + 1) as session_year,
  y.year_val as start_year,
  y.year_val + 1 as end_year,
  CASE WHEN y.year_val = 2025 THEN true ELSE false END as is_active,
  NOW()
FROM schools_needing_sessions s
CROSS JOIN (
  SELECT generate_series(2025, 2060) as year_val
) y
ON CONFLICT (school_id, session_year) DO NOTHING;

-- ============================================================================
-- STEP 4: Populate terms if sessions exist but have no terms
-- ============================================================================

WITH sessions_needing_terms AS (
  SELECT DISTINCT a.id as session_id, a.school_id
  FROM academic_sessions a
  LEFT JOIN academic_terms t ON a.id = t.session_id
  WHERE t.id IS NULL -- No terms exist for this session
)
, term_definitions AS (
  SELECT 
    'First Term' as term_name,
    1 as term_order,
    DATE '2025-09-01' as start_date,
    DATE '2025-11-30' as end_date
  UNION ALL
  SELECT 
    'Second Term' as term_name,
    2 as term_order,
    DATE '2025-12-01' as start_date,
    DATE '2026-03-31' as end_date
  UNION ALL
  SELECT 
    'Third Term' as term_name,
    3 as term_order,
    DATE '2026-04-01' as start_date,
    DATE '2026-07-31' as end_date
)
INSERT INTO academic_terms (session_id, school_id, term_name, term_order, start_date, end_date, is_active, created_at)
SELECT 
  snt.session_id,
  snt.school_id,
  td.term_name,
  td.term_order,
  td.start_date,
  td.end_date,
  CASE 
    WHEN td.term_name = 'First Term' AND 
         EXISTS (SELECT 1 FROM academic_sessions WHERE id = snt.session_id AND is_active = true)
    THEN true 
    ELSE false 
  END as is_active,
  NOW()
FROM sessions_needing_terms snt
CROSS JOIN term_definitions td
ON CONFLICT (session_id, term_name) DO NOTHING;

-- ============================================================================
-- STEP 5: Create indexes if missing
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_academic_sessions_school ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_active ON academic_sessions(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_year ON academic_sessions(start_year);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_active ON academic_terms(session_id, is_active);

-- ============================================================================
-- STEP 6: Diagnostic Logging (stored as comments for verification)
-- ============================================================================

-- Count total schools
-- SELECT COUNT(*) as total_schools FROM schools;

-- Count schools WITH sessions
-- SELECT COUNT(DISTINCT school_id) as schools_with_sessions FROM academic_sessions;

-- Count schools WITHOUT sessions
-- SELECT COUNT(*) as schools_without_sessions FROM (
--   SELECT DISTINCT s.id FROM schools s
--   LEFT JOIN academic_sessions a ON s.id = a.school_id WHERE a.id IS NULL
-- ) t;

-- Count total sessions
-- SELECT COUNT(*) as total_sessions FROM academic_sessions;

-- Count total terms
-- SELECT COUNT(*) as total_terms FROM academic_terms;

-- Verify first school has sessions
-- SELECT * FROM academic_sessions 
-- WHERE school_id = (SELECT id FROM schools LIMIT 1)
-- LIMIT 5;

-- Verify sessions have terms
-- SELECT s.session_year, COUNT(t.id) as term_count
-- FROM academic_sessions s
-- LEFT JOIN academic_terms t ON s.id = t.session_id
-- WHERE s.school_id = (SELECT id FROM schools LIMIT 1)
-- GROUP BY s.id, s.session_year
-- LIMIT 5;

COMMIT;
