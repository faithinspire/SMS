-- Migration 111: Populate Academic Sessions and Terms (2025/2026 to 2060/2061)
-- Separate sessions from terms for better organization
-- Sessions: Academic years (e.g., 2025/2026)
-- Terms: Within sessions (First Term, Second Term, Third Term)
-- SCHEMA: academic_sessions uses session_year, is_active, start_year, end_year

BEGIN;

-- Ensure academic_sessions table exists with correct schema
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

-- Ensure academic_terms table exists
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

-- Get all schools (to populate sessions/terms for each school)
WITH schools AS (
  SELECT DISTINCT id FROM schools
)
-- Generate sessions from 2025/2026 to 2060/2061
, session_years AS (
  SELECT generate_series(2025, 2060) as start_year
)
, all_combinations AS (
  SELECT 
    s.id as school_id,
    sy.start_year,
    sy.start_year + 1 as end_year
  FROM schools s
  CROSS JOIN session_years sy
)
INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active, created_at)
SELECT 
  school_id,
  start_year || '/' || end_year as session_year,
  start_year,
  end_year,
  CASE WHEN start_year = 2025 THEN true ELSE false END as is_active,
  NOW()
FROM all_combinations
ON CONFLICT (school_id, session_year) DO NOTHING;

-- Now populate terms for each academic session
-- Sessions must exist first
WITH session_data AS (
  SELECT id as session_id, school_id FROM academic_sessions
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
INSERT INTO academic_terms (
  session_id,
  school_id, 
  term_name, 
  term_order,
  start_date, 
  end_date,
  is_active,
  created_at
)
SELECT 
  sd.session_id,
  sd.school_id,
  td.term_name,
  td.term_order,
  td.start_date,
  td.end_date,
  CASE WHEN td.term_name = 'First Term' AND sd.session_id IN (
    SELECT id FROM academic_sessions WHERE is_active = true LIMIT 1
  ) THEN true ELSE false END as is_active,
  NOW()
FROM session_data sd
CROSS JOIN term_definitions td
ON CONFLICT (session_id, term_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_active ON academic_sessions(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school ON academic_terms(school_id);

COMMIT;
