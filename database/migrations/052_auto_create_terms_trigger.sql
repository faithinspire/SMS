-- ============================================================================
-- MIGRATION 052: Auto-Generate Terms Trigger
-- ============================================================================
--
-- PURPOSE: Automatically create First/Second/Third Terms whenever a new
-- academic session is created.
--
-- TRIGGER BEHAVIOR:
-- When INSERT happens on academic_sessions:
-- 1. Check if terms already exist for this session (idempotent)
-- 2. Create First Term: Sept 1 - Nov 30
-- 3. Create Second Term: Dec 1 - Feb 28/29
-- 4. Create Third Term: Mar 1 - May 31
-- 5. Mark first term as active (is_active = TRUE)
--
-- DATES: Calculated based on start_year from the session
-- Example: 2026/2027 session (start_year=2026) creates:
--   First Term: 2026-09-01 to 2026-11-30
--   Second Term: 2026-12-01 to 2027-02-28
--   Third Term: 2027-03-01 to 2027-05-31
--
-- ============================================================================

-- Step 1: Create stored procedure to generate terms for a session
CREATE OR REPLACE FUNCTION generate_default_terms_for_session(
  session_id_param UUID,
  school_id_param UUID,
  start_year_param INT
) RETURNS void AS $$
DECLARE
  second_year INT;
BEGIN
  second_year := start_year_param + 1;
  
  -- Insert First Term (Sept 1 - Nov 30)
  INSERT INTO academic_terms (
    session_id, school_id, term_name, term_order,
    start_date, end_date, is_active
  ) VALUES (
    session_id_param, school_id_param, 'First Term', 1,
    MAKE_DATE(start_year_param, 9, 1),
    MAKE_DATE(start_year_param, 11, 30),
    TRUE  -- Mark first term as active
  ) ON CONFLICT (session_id, term_name) DO NOTHING;
  
  -- Insert Second Term (Dec 1 - Feb 28/29)
  INSERT INTO academic_terms (
    session_id, school_id, term_name, term_order,
    start_date, end_date, is_active
  ) VALUES (
    session_id_param, school_id_param, 'Second Term', 2,
    MAKE_DATE(start_year_param, 12, 1),
    MAKE_DATE(second_year, 2, 28),
    FALSE
  ) ON CONFLICT (session_id, term_name) DO NOTHING;
  
  -- Insert Third Term (Mar 1 - May 31)
  INSERT INTO academic_terms (
    session_id, school_id, term_name, term_order,
    start_date, end_date, is_active
  ) VALUES (
    session_id_param, school_id_param, 'Third Term', 3,
    MAKE_DATE(second_year, 3, 1),
    MAKE_DATE(second_year, 5, 31),
    FALSE
  ) ON CONFLICT (session_id, term_name) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger that fires AFTER INSERT on academic_sessions
CREATE OR REPLACE FUNCTION trigger_auto_create_terms()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the procedure to generate default terms
  PERFORM generate_default_terms_for_session(
    NEW.id,
    NEW.school_id,
    NEW.start_year
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Attach trigger to academic_sessions table
DROP TRIGGER IF EXISTS trg_auto_create_terms ON academic_sessions;

CREATE TRIGGER trg_auto_create_terms
AFTER INSERT ON academic_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_create_terms();

-- Step 4: Backfill - Generate terms for any existing sessions that don't have terms
DO $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN 
    SELECT s.id, s.school_id, s.start_year
    FROM academic_sessions s
    WHERE NOT EXISTS (
      SELECT 1 FROM academic_terms t WHERE t.session_id = s.id
    )
  LOOP
    PERFORM generate_default_terms_for_session(
      session_record.id,
      session_record.school_id,
      session_record.start_year
    );
  END LOOP;
END $$;

-- Step 5: Verify trigger and backfill
SELECT 
  'AUTO-GENERATE TERMS TRIGGER INSTALLED' as status,
  COUNT(DISTINCT s.id) as sessions_with_terms
FROM academic_sessions s
WHERE EXISTS (
  SELECT 1 FROM academic_terms t WHERE t.session_id = s.id
);

-- Step 6: Show sample terms generated
SELECT 
  'GENERATED TERMS SAMPLE' as section,
  s.session_year as session,
  t.term_name as term,
  t.term_order as order,
  t.start_date,
  t.end_date,
  t.is_active
FROM academic_sessions s
JOIN academic_terms t ON s.id = t.session_id
ORDER BY s.start_year DESC, t.term_order ASC
LIMIT 9;
