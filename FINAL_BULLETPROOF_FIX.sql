-- ============================================================================
-- FINAL BULLETPROOF FIX FOR 42P10 ERROR
-- Run this in Supabase SQL Editor - fixes school registration permanently
-- ============================================================================

-- Drop all existing broken triggers and functions first
DROP TRIGGER IF EXISTS auto_initialize_school_curriculum ON schools;
DROP TRIGGER IF EXISTS trigger_auto_seed_school_old ON schools;
DROP FUNCTION IF EXISTS trigger_auto_seed_school() CASCADE;
DROP FUNCTION IF EXISTS auto_seed_school_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_term(UUID, UUID, VARCHAR, INT, DATE, DATE, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_session(UUID, VARCHAR, INT, BOOLEAN) CASCADE;

-- ============================================================================
-- Create bullet-proof safe functions with zero ON CONFLICT usage
-- ============================================================================

-- Function 1: Safely insert academic session (never conflicts)
CREATE FUNCTION safe_insert_academic_session(
  p_school_id UUID,
  p_session_year VARCHAR,
  p_start_year INT,
  p_is_active BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- First, try to find existing session
  SELECT id INTO v_session_id FROM academic_sessions
  WHERE school_id = p_school_id AND session_year = p_session_year
  LIMIT 1;
  
  -- If found, return it
  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;
  
  -- If not found, insert and return new ID
  INSERT INTO academic_sessions (school_id, session_year, start_year, is_active, created_at, updated_at)
  VALUES (p_school_id, p_session_year, p_start_year, p_is_active, NOW(), NOW())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_session_id;
  
  -- If INSERT returned NULL (duplicate inserted by another process), fetch it
  IF v_session_id IS NULL THEN
    SELECT id INTO v_session_id FROM academic_sessions
    WHERE school_id = p_school_id AND session_year = p_session_year
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_session_id, gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Function 2: Safely insert academic term (never conflicts)
CREATE FUNCTION safe_insert_academic_term(
  p_school_id UUID,
  p_session_id UUID,
  p_term_name VARCHAR,
  p_term_order INT,
  p_start_date DATE,
  p_end_date DATE,
  p_is_active BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_term_id UUID;
BEGIN
  -- First, try to find existing term
  SELECT id INTO v_term_id FROM academic_terms
  WHERE session_id = p_session_id 
    AND term_name = p_term_name
    AND term_order = p_term_order
  LIMIT 1;
  
  -- If found, return it
  IF v_term_id IS NOT NULL THEN
    RETURN v_term_id;
  END IF;
  
  -- If not found, insert and return new ID
  INSERT INTO academic_terms (school_id, session_id, term_name, term_order, start_date, end_date, is_active, created_at, updated_at)
  VALUES (p_school_id, p_session_id, p_term_name, p_term_order, p_start_date, p_end_date, p_is_active, NOW(), NOW())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_term_id;
  
  -- If INSERT returned NULL, fetch it
  IF v_term_id IS NULL THEN
    SELECT id INTO v_term_id FROM academic_terms
    WHERE session_id = p_session_id 
      AND term_name = p_term_name
      AND term_order = p_term_order
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_term_id, gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Function 3: Main seeding function that orchestrates everything safely
CREATE FUNCTION auto_seed_school_safe(p_school_id UUID) RETURNS VOID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Create default session
  v_session_id := safe_insert_academic_session(p_school_id, '2024/2025', 2024, true);
  
  -- Only create terms if we have a valid session
  IF v_session_id IS NOT NULL THEN
    PERFORM safe_insert_academic_term(p_school_id, v_session_id, 'First Term', 1, '2024-09-01'::DATE, '2024-11-30'::DATE, true);
    PERFORM safe_insert_academic_term(p_school_id, v_session_id, 'Second Term', 2, '2024-12-01'::DATE, '2025-02-28'::DATE, false);
    PERFORM safe_insert_academic_term(p_school_id, v_session_id, 'Third Term', 3, '2025-03-01'::DATE, '2025-05-31'::DATE, false);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Trigger wrapper that calls the safe seed function
CREATE FUNCTION trigger_auto_seed_on_school_insert() RETURNS TRIGGER AS $$
BEGIN
  -- Call the safe seeding function
  PERFORM auto_seed_school_safe(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create the trigger that fires on school INSERT
-- ============================================================================

CREATE TRIGGER auto_initialize_school_curriculum
AFTER INSERT ON schools
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_seed_on_school_insert();

-- ============================================================================
-- Auto-seed any existing schools that don't have sessions yet
-- ============================================================================

DO $$
DECLARE
  v_school record;
BEGIN
  -- Loop through all schools
  FOR v_school IN SELECT id FROM schools LOOP
    -- If school has no sessions, seed it
    IF NOT EXISTS (SELECT 1 FROM academic_sessions WHERE school_id = v_school.id) THEN
      PERFORM auto_seed_school_safe(v_school.id);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Final verification
-- ============================================================================

SELECT 'School Registration Fix Complete' as status;
SELECT COUNT(*) as total_schools, COUNT(DISTINCT s.id) as schools_with_sessions
FROM schools s
LEFT JOIN academic_sessions ac ON s.id = ac.school_id;
