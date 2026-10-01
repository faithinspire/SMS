-- Migration 152: Add core academic tables (academic_sessions, academic_terms)
-- These are critical for the results page to function

-- Step 1: Create academic_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year TEXT NOT NULL,
  start_year INTEGER,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, session_year)
);

-- Step 2: Create academic_terms table if it doesn't exist
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_name TEXT NOT NULL,
  term_order INTEGER NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, session_id, term_order),
  CHECK (end_date > start_date)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(is_active);

-- Step 4: Disable RLS for admin access
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms DISABLE ROW LEVEL SECURITY;

-- Step 5: Populate initial data - use simple INSERT with existence check
-- Only insert if no sessions exist for the school
DO $$
BEGIN
  INSERT INTO academic_sessions (school_id, session_year, start_year, is_active)
  SELECT id, '2024/2025', 2024, true FROM schools
  WHERE id NOT IN (SELECT DISTINCT school_id FROM academic_sessions)
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
  NULL;
END;
$$;

-- Step 6: Populate terms - wait for sessions to exist
DO $$
DECLARE
  v_school_id UUID;
  v_session_id UUID;
BEGIN
  FOR v_school_id IN SELECT id FROM schools LOOP
    -- Get or create session for this school
    SELECT id INTO v_session_id FROM academic_sessions 
    WHERE school_id = v_school_id 
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
      INSERT INTO academic_sessions (school_id, session_year, start_year, is_active)
      VALUES (v_school_id, '2024/2025', 2024, true)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_session_id;
    END IF;
    
    -- Only insert if term doesn't exist
    IF v_session_id IS NOT NULL THEN
      INSERT INTO academic_terms (school_id, session_id, term_name, term_order, start_date, end_date, is_active)
      SELECT v_school_id, v_session_id, 'First Term', 1, MAKE_DATE(2024, 9, 1), MAKE_DATE(2024, 11, 30), true
      WHERE NOT EXISTS (
        SELECT 1 FROM academic_terms 
        WHERE school_id = v_school_id AND session_id = v_session_id AND term_order = 1
      )
      ON CONFLICT DO NOTHING;
      
      INSERT INTO academic_terms (school_id, session_id, term_name, term_order, start_date, end_date, is_active)
      SELECT v_school_id, v_session_id, 'Second Term', 2, MAKE_DATE(2024, 12, 1), MAKE_DATE(2025, 2, 28), false
      WHERE NOT EXISTS (
        SELECT 1 FROM academic_terms 
        WHERE school_id = v_school_id AND session_id = v_session_id AND term_order = 2
      )
      ON CONFLICT DO NOTHING;
      
      INSERT INTO academic_terms (school_id, session_id, term_name, term_order, start_date, end_date, is_active)
      SELECT v_school_id, v_session_id, 'Third Term', 3, MAKE_DATE(2025, 3, 1), MAKE_DATE(2025, 5, 31), false
      WHERE NOT EXISTS (
        SELECT 1 FROM academic_terms 
        WHERE school_id = v_school_id AND session_id = v_session_id AND term_order = 3
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
EXCEPTION WHEN others THEN
  NULL;
END;
$$;
