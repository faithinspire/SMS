-- MIGRATION 049: Populate Terms and Academic Sessions
-- PURPOSE: Ensure all schools have default academic terms and sessions
-- TARGET: Specifically ensures school dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877 has First/Second/Third Terms
-- NOTE: Uses actual academic_sessions schema from migration 046 (session_year, not session_string)

-- ============================================================================
-- STEP 1: Verify academic_sessions table exists (created in migration 046)
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

CREATE INDEX IF NOT EXISTS idx_academic_sessions_school ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_current ON academic_sessions(is_current);

-- ============================================================================
-- STEP 2: Populate academic_sessions for all schools (2026/2027)
-- ============================================================================

INSERT INTO academic_sessions (school_id, session_year, name, is_current)
SELECT 
  s.id,
  '2026/2027',
  '2026/2027 Academic Session',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions as2
  WHERE as2.school_id = s.id 
    AND as2.session_year = '2026/2027'
)
ON CONFLICT (school_id, session_year) DO NOTHING;

-- ============================================================================
-- STEP 3: Populate terms for all schools
-- ============================================================================

-- First, populate terms table with default terms
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current)
SELECT 
  s.id AS school_id,
  term_data.name,
  term_data.session_year,
  term_data.start_date,
  term_data.end_date,
  term_data.is_current
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term', 2026, '2026-09-01'::date, '2026-11-30'::date, TRUE),
    ('Second Term', 2026, '2026-12-01'::date, '2027-02-28'::date, FALSE),
    ('Third Term', 2026, '2027-03-01'::date, '2027-05-31'::date, FALSE)
) AS term_data(name, session_year, start_date, end_date, is_current)
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.school_id = s.id 
    AND t.name = term_data.name
    AND t.session_year = term_data.session_year
)
ON CONFLICT (school_id, session_year, name) DO NOTHING;

-- ============================================================================
-- STEP 4: Verify population - Show terms for target school
-- ============================================================================

SELECT 'TERMS FOR TARGET SCHOOL' as section;

SELECT 
  s.name as school_name,
  s.id as school_id,
  t.name as term_name,
  t.session_year,
  t.start_date,
  t.end_date,
  t.is_current
FROM schools s
LEFT JOIN terms t ON s.id = t.school_id
WHERE s.id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
ORDER BY t.session_year DESC, t.name;

-- ============================================================================
-- STEP 5: Verify population - Show academic sessions for target school
-- ============================================================================

SELECT 'ACADEMIC SESSIONS FOR TARGET SCHOOL' as section;

SELECT 
  s.name as school_name,
  s.id as school_id,
  as2.session_year,
  as2.name,
  as2.is_current
FROM schools s
LEFT JOIN academic_sessions as2 ON s.id = as2.school_id
WHERE s.id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
ORDER BY as2.session_year DESC;

-- ============================================================================
-- STEP 6: Summary - Show all schools with term counts
-- ============================================================================

SELECT 'TERM POPULATION SUMMARY' as section;

SELECT 
  s.name as school_name,
  s.id as school_id,
  COUNT(t.id) as term_count,
  COUNT(DISTINCT as2.id) as session_count
FROM schools s
LEFT JOIN terms t ON s.id = t.school_id
LEFT JOIN academic_sessions as2 ON s.id = as2.school_id
GROUP BY s.id, s.name
ORDER BY s.name;

-- ============================================================================
-- STEP 7: Verify target school specifically
-- ============================================================================

SELECT 'TARGET SCHOOL VERIFICATION' as section;

SELECT 
  'School exists' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM schools 
WHERE id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'

UNION ALL

SELECT 
  'School has terms' as check_type,
  CASE WHEN COUNT(*) >= 3 THEN 'YES' ELSE 'NO' END as result
FROM terms
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'

UNION ALL

SELECT 
  'First Term exists' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM terms
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
  AND name = 'First Term'

UNION ALL

SELECT 
  'Second Term exists' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM terms
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
  AND name = 'Second Term'

UNION ALL

SELECT 
  'Third Term exists' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM terms
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
  AND name = 'Third Term'

UNION ALL

SELECT 
  'School has academic session' as check_type,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM academic_sessions
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877';
