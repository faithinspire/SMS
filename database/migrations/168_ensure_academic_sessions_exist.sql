-- Migration 168: Populate Academic Sessions 2024-2040 for All Schools
-- Purpose: Create all 16 years of academic sessions (2024/2025 through 2039/2040)

BEGIN;

-- Step 1: Delete existing incomplete sessions (keep only valid ones)
DELETE FROM academic_sessions 
WHERE session_year IS NULL 
   OR session_year = ''
   OR (start_year IS NULL)
   OR (end_year IS NULL);

-- Step 2: For each school, create sessions from 2024 to 2040
DO $$ 
DECLARE
  school_record RECORD;
  start_yr INT;
  end_yr INT;
  session_str VARCHAR(20);
BEGIN
  -- Loop through all schools
  FOR school_record IN SELECT id FROM schools WHERE status = 'ACTIVE' LOOP
    -- Create sessions for years 2024 through 2039 (start_year 2024-2039, end_year 2025-2040)
    FOR start_yr IN 2024..2039 LOOP
      end_yr := start_yr + 1;
      session_str := start_yr || '/' || end_yr;
      
      -- Insert session if it doesn't already exist
      INSERT INTO academic_sessions (
        school_id,
        session_year,
        name,
        start_year,
        end_year,
        is_active,
        is_current,
        created_at
      ) VALUES (
        school_record.id,
        session_str,
        session_str,
        start_yr,
        end_yr,
        CASE WHEN start_yr = 2026 THEN TRUE ELSE FALSE END,  -- Only 2026/2027 is active
        CASE WHEN start_yr = 2026 THEN TRUE ELSE FALSE END,  -- Only 2026/2027 is current
        NOW()
      ) ON CONFLICT (school_id, start_year, end_year) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created sessions 2024-2040 for school: %', school_record.id;
  END LOOP;
END $$;

-- Step 3: Verify results - Show all sessions for each school
SELECT 
  school_id,
  COUNT(*) as total_sessions,
  MIN(start_year) as earliest_year,
  MAX(start_year) as latest_year,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count,
  json_agg(
    json_build_object(
      'session_year', session_year,
      'start_year', start_year,
      'end_year', end_year,
      'is_active', is_active,
      'is_current', is_current
    ) ORDER BY start_year ASC
  ) as sessions
FROM academic_sessions
GROUP BY school_id
ORDER BY school_id;

COMMIT;
