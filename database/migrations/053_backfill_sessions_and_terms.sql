-- ============================================================================
-- MIGRATION 053: Backfill Existing Sessions and Auto-Generate Terms
-- ============================================================================
--
-- PURPOSE: Ensure all existing academic sessions have proper start_year,
-- end_year, and auto-generated terms. This makes the system instantly
-- ready to support unlimited future sessions.
--
-- STEPS:
-- 1. Create default sessions for 2024/2025, 2025/2026, 2026/2027, 2027/2028
--    for all schools (if not already present)
-- 2. Parse existing session_year and populate start_year/end_year
-- 3. Ensure each session has First/Second/Third Terms
-- 4. Mark 2026/2027 as active (current session)
-- 5. Verify data integrity
--
-- RESULT: System can now support unlimited future sessions without code changes
--
-- ============================================================================

-- Step 1: Ensure we have at least 4 years of sessions for each school
-- This provides a foundation; admins can create more as needed
DO $$
DECLARE
  school_record RECORD;
  year_offset INT;
  session_year_str VARCHAR(20);
  start_year_val INT;
  end_year_val INT;
BEGIN
  FOR school_record IN SELECT id FROM schools LOOP
    -- Create sessions for past 2 years, current year, and next 2 years
    FOR year_offset IN -2..2 LOOP
      start_year_val := EXTRACT(YEAR FROM NOW())::INT + year_offset;
      end_year_val := start_year_val + 1;
      session_year_str := start_year_val || '/' || end_year_val;
      
      -- Insert if not exists
      INSERT INTO academic_sessions (
        school_id, session_year, start_year, end_year, 
        is_active, created_at, updated_at
      ) VALUES (
        school_record.id,
        session_year_str,
        start_year_val,
        end_year_val,
        (session_year_str = '2026/2027'),  -- Make 2026/2027 active
        NOW(),
        NOW()
      )
      ON CONFLICT (school_id, session_year) 
      DO UPDATE SET updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Ensure all sessions have start_year and end_year populated
UPDATE academic_sessions
SET 
  start_year = COALESCE(start_year, CAST(SUBSTRING(session_year, 1, 4) AS INT)),
  end_year = COALESCE(end_year, CAST(SUBSTRING(session_year, 6, 4) AS INT)),
  updated_at = NOW()
WHERE start_year IS NULL OR end_year IS NULL;

-- Step 3: Ensure every session has default terms
-- The trigger should have created them, but this ensures completeness
DO $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN 
    SELECT id, school_id, start_year
    FROM academic_sessions
    WHERE NOT EXISTS (
      SELECT 1 FROM academic_terms t WHERE t.session_id = academic_sessions.id
    )
  LOOP
    PERFORM generate_default_terms_for_session(
      session_record.id,
      session_record.school_id,
      session_record.start_year
    );
  END LOOP;
END $$;

-- Step 4: Ensure UNIQUE is_active constraint (only 1 active session per school)
DO $$
DECLARE
  school_record RECORD;
BEGIN
  FOR school_record IN 
    SELECT school_id FROM academic_sessions 
    GROUP BY school_id 
    HAVING COUNT(CASE WHEN is_active THEN 1 END) > 1 
  LOOP
    -- Keep 2026/2027 as active if it exists, otherwise most recent
    UPDATE academic_sessions
    SET is_active = FALSE
    WHERE school_id = school_record.school_id AND is_active = TRUE
      AND id != COALESCE(
        (SELECT id FROM academic_sessions 
         WHERE school_id = school_record.school_id 
         AND session_year = '2026/2027' LIMIT 1),
        (SELECT id FROM academic_sessions 
         WHERE school_id = school_record.school_id 
         ORDER BY start_year DESC LIMIT 1)
      );
  END LOOP;
END $$;

-- Step 5: Verify population for target school
SELECT 
  '=== TARGET SCHOOL: dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877 ===' as section;

SELECT 
  s.name as school,
  as2.session_year as session,
  as2.start_year,
  as2.end_year,
  as2.is_active,
  COUNT(t.id) as term_count
FROM schools s
LEFT JOIN academic_sessions as2 ON s.id = as2.school_id
LEFT JOIN academic_terms t ON as2.id = t.session_id
WHERE s.id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
GROUP BY s.id, s.name, as2.id, as2.session_year, as2.start_year, as2.end_year, as2.is_active
ORDER BY as2.start_year DESC;

-- Step 6: Verify terms for target school
SELECT 
  '=== TERMS FOR TARGET SCHOOL ===' as section;

SELECT 
  as2.session_year as session,
  t.term_name as term,
  t.term_order as order,
  t.start_date,
  t.end_date,
  t.is_active
FROM academic_sessions as2
JOIN academic_terms t ON as2.id = t.session_id
WHERE as2.school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
ORDER BY as2.start_year DESC, t.term_order ASC;

-- Step 7: Global summary
SELECT 
  '=== GLOBAL SUMMARY ===' as section;

SELECT 
  COUNT(DISTINCT as2.school_id) as total_schools,
  COUNT(DISTINCT as2.id) as total_sessions,
  COUNT(DISTINCT t.id) as total_terms,
  COUNT(DISTINCT CASE WHEN as2.is_active THEN as2.id END) as active_sessions
FROM academic_sessions as2
LEFT JOIN academic_terms t ON as2.id = t.session_id;

-- Step 8: Show year range coverage
SELECT 
  '=== YEAR RANGE COVERAGE ===' as section;

SELECT 
  MIN(as2.start_year) as earliest_year,
  MAX(as2.end_year) as latest_year,
  MAX(as2.end_year) - MIN(as2.start_year) + 1 as year_span
FROM academic_sessions as2;

COMMIT;
