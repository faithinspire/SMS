-- Migration 168: Populate Academic Sessions 2024-2040 for All Schools
-- Simple approach: delete old data, then insert fresh 16-year range

BEGIN;

-- Step 1: Delete all NULL or empty session_year rows
DELETE FROM academic_sessions 
WHERE session_year IS NULL OR session_year = '';

-- Step 2: For each school, insert sessions 2024-2040
DO $$ 
DECLARE
  school_record RECORD;
  start_yr INT;
  end_yr INT;
  session_str VARCHAR(20);
BEGIN
  FOR school_record IN SELECT id FROM schools WHERE status = 'ACTIVE' LOOP
    -- Delete old sessions for this school, keep only those with valid years
    DELETE FROM academic_sessions 
    WHERE school_id = school_record.id 
      AND (start_year IS NULL OR start_year < 2024 OR start_year > 2039);
    
    -- Create sessions for 2024-2039
    FOR start_yr IN 2024..2039 LOOP
      end_yr := start_yr + 1;
      session_str := start_yr || '/' || end_yr;
      
      -- Insert only if doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM academic_sessions 
        WHERE school_id = school_record.id 
          AND start_year = start_yr 
          AND end_year = end_yr
      ) THEN
        INSERT INTO academic_sessions (
          school_id,
          session_year,
          start_year,
          end_year,
          is_active
        ) VALUES (
          school_record.id,
          session_str,
          start_yr,
          end_yr,
          CASE WHEN start_yr = 2026 THEN TRUE ELSE FALSE END
        );
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Processed sessions for school: %', school_record.id;
  END LOOP;
END $$;

-- Step 3: Final verification
SELECT 
  school_id,
  COUNT(*) as total_sessions,
  MIN(start_year) as earliest_year,
  MAX(start_year) as latest_year,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM academic_sessions
WHERE start_year IS NOT NULL
GROUP BY school_id
ORDER BY school_id;

COMMIT;
