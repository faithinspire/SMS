-- ============================================================================
-- MIGRATION 054: Universal Academic Sessions Complete Rebuild
-- ============================================================================
--
-- PURPOSE: Complete, self-contained migration that handles the full academic
-- session/term system rebuild in one transaction. Works whether or not 
-- migrations 050-053 have been applied. Ensures database is ready for
-- unlimited future sessions with proper relational hierarchy.
--
-- OPERATIONS:
-- 1. Ensure academic_sessions table exists with all required columns
-- 2. Ensure academic_terms table exists with session_id FK
-- 3. Create auto-generation trigger if not exists
-- 4. Backfill sessions with proper structure
-- 5. Generate terms for all sessions
-- 6. Verify integrity
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: REBUILD academic_sessions TABLE
-- ============================================================================

-- Ensure table exists with full schema
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

-- Add missing columns safely
DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS start_year INT;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS end_year INT;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE academic_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add CHECK constraint if not exists
DO $$
BEGIN
  ALTER TABLE academic_sessions
  ADD CONSTRAINT check_academic_session_years
  CHECK (end_year = start_year + 1);
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Populate missing start_year and end_year
UPDATE academic_sessions
SET 
  start_year = CAST(SUBSTRING(session_year, 1, 4) AS INT),
  end_year = CAST(SUBSTRING(session_year, 6, 4) AS INT)
WHERE start_year IS NULL OR end_year IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school 
  ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_active 
  ON academic_sessions(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_start_year 
  ON academic_sessions(school_id, start_year DESC);

-- ============================================================================
-- PHASE 1b: FIX academic_sessions NOT NULL NAME CONSTRAINT
-- ============================================================================

-- Handle the 'name' column if it exists and is NOT NULL
DO $$
BEGIN
  -- Drop name column if it exists (we don't need it, we have session_year)
  ALTER TABLE academic_sessions DROP COLUMN IF EXISTS name CASCADE;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- PHASE 2: REBUILD academic_terms TABLE (if needed)
-- ============================================================================

-- Drop old academic_terms if it exists with wrong schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'academic_terms' 
    AND table_schema = 'public'
  ) THEN
    DROP TABLE IF EXISTS academic_terms CASCADE;
  END IF;
END $$;

-- Backup old terms table if it exists and is old schema
DO $$
BEGIN
  -- Check if old terms table exists with old schema (session_year INT, not session_id UUID)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'terms' 
    AND table_schema = 'public'
  ) THEN
    -- Check if it has session_year column but no session_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'terms' 
      AND column_name = 'session_year'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'terms' 
      AND column_name = 'session_id'
    ) THEN
      -- Old schema detected - rename for backup
      ALTER TABLE IF EXISTS terms RENAME TO terms_backup_old_schema;
    END IF;
  END IF;
END $$;

-- Create new academic_terms table if it doesn't exist
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

-- Create indexes
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

-- Migrate data from old terms table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'terms_backup_old_schema'
  ) THEN
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
    FROM terms_backup_old_schema t
    JOIN academic_sessions s ON t.school_id = s.school_id 
      AND CAST(SUBSTRING(s.session_year, 1, 4) AS INT) = t.session_year
    WHERE NOT EXISTS (
      SELECT 1 FROM academic_terms at2
      WHERE at2.session_id = s.id 
        AND at2.term_name = t.name
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: CREATE AUTO-GENERATION FUNCTION (idempotent, BEFORE trigger)
-- ============================================================================

-- First, create the generate function
CREATE OR REPLACE FUNCTION generate_default_terms_for_session(
  session_id_param UUID,
  school_id_param UUID,
  start_year_param INT
) RETURNS void AS $$
DECLARE
  second_year INT;
BEGIN
  second_year := start_year_param + 1;
  
  INSERT INTO academic_terms (
    session_id, school_id, term_name, term_order,
    start_date, end_date, is_active
  ) VALUES 
    (session_id_param, school_id_param, 'First Term', 1,
     MAKE_DATE(start_year_param, 9, 1),
     MAKE_DATE(start_year_param, 11, 30), TRUE),
    (session_id_param, school_id_param, 'Second Term', 2,
     MAKE_DATE(start_year_param, 12, 1),
     MAKE_DATE(second_year, 2, 28), FALSE),
    (session_id_param, school_id_param, 'Third Term', 3,
     MAKE_DATE(second_year, 3, 1),
     MAKE_DATE(second_year, 5, 31), FALSE)
  ON CONFLICT (session_id, term_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Second, create the trigger function that calls generate function
CREATE OR REPLACE FUNCTION trigger_auto_create_terms()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM generate_default_terms_for_session(
    NEW.id,
    NEW.school_id,
    NEW.start_year
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Third, create or replace the trigger
DROP TRIGGER IF EXISTS trg_auto_create_terms ON academic_sessions;

CREATE TRIGGER trg_auto_create_terms
AFTER INSERT ON academic_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_create_terms();

-- ============================================================================
-- PHASE 4: BACKFILL SESSIONS FOR ALL SCHOOLS
-- ============================================================================

DO $$
DECLARE
  school_record RECORD;
  year_offset INT;
  session_year_str VARCHAR(20);
  start_year_val INT;
  end_year_val INT;
BEGIN
  FOR school_record IN SELECT id FROM schools LOOP
    -- Create sessions for years: current_year-2 through current_year+2
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
        (session_year_str = '2026/2027'),
        NOW(),
        NOW()
      )
      ON CONFLICT (school_id, session_year) 
      DO UPDATE SET updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- PHASE 5: GENERATE TERMS FOR ALL SESSIONS
-- ============================================================================

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

-- ============================================================================
-- PHASE 6: ENFORCE SINGLE ACTIVE SESSION PER SCHOOL
-- ============================================================================

DO $$
DECLARE
  school_record RECORD;
BEGIN
  FOR school_record IN 
    SELECT school_id FROM academic_sessions 
    GROUP BY school_id 
    HAVING COUNT(CASE WHEN is_active THEN 1 END) > 1 
  LOOP
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

-- ============================================================================
-- PHASE 7: VERIFICATION & REPORTING
-- ============================================================================

-- Summary report
SELECT 
  'UNIVERSAL ACADEMIC SESSIONS REBUILD COMPLETE' as status,
  COUNT(DISTINCT school_id) as schools,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN is_active THEN 1 END) as active_sessions,
  MIN(start_year) as earliest_year,
  MAX(end_year) as latest_year
FROM academic_sessions;

-- Sample data
SELECT 
  s.name as school,
  as2.session_year as session,
  as2.is_active,
  COUNT(t.id) as term_count
FROM academic_sessions as2
JOIN schools s ON as2.school_id = s.id
LEFT JOIN academic_terms t ON as2.id = t.session_id
GROUP BY s.id, s.name, as2.id, as2.session_year, as2.is_active
ORDER BY as2.start_year DESC
LIMIT 20;

-- Target school verification
SELECT 
  'TARGET SCHOOL' as section,
  COUNT(*) as session_count
FROM academic_sessions
WHERE school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877';

-- Show terms for target school
SELECT 
  as2.session_year as session,
  t.term_name as term,
  t.term_order as order_num
FROM academic_sessions as2
LEFT JOIN academic_terms t ON as2.id = t.session_id
WHERE as2.school_id = 'dc4ecc86-a983-4cf0-a8fd-b43bfa5d5877'
ORDER BY as2.start_year DESC, t.term_order ASC;

COMMIT;
