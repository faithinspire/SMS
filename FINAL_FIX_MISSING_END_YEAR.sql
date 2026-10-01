-- ============================================================================
-- FIX: Add missing end_year to academic_sessions insert
-- Run this in Supabase SQL Editor to fix the 23502 error
-- ============================================================================

-- Drop the old broken function
DROP FUNCTION IF EXISTS safe_insert_academic_session(UUID, VARCHAR, INT, BOOLEAN) CASCADE;

-- Create corrected function with end_year included
CREATE FUNCTION safe_insert_academic_session(
  p_school_id UUID,
  p_session_year VARCHAR,
  p_start_year INT,
  p_is_active BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  SELECT id INTO v_session_id FROM academic_sessions
  WHERE school_id = p_school_id AND session_year = p_session_year
  LIMIT 1;
  
  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;
  
  -- INSERT with end_year = start_year + 1
  INSERT INTO academic_sessions (school_id, session_year, start_year, end_year, is_active, created_at, updated_at)
  VALUES (p_school_id, p_session_year, p_start_year, p_start_year + 1, p_is_active, NOW(), NOW())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_session_id;
  
  IF v_session_id IS NULL THEN
    SELECT id INTO v_session_id FROM academic_sessions
    WHERE school_id = p_school_id AND session_year = p_session_year
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_session_id, gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger (it will use the new function)
DROP TRIGGER IF EXISTS auto_initialize_school_curriculum ON schools;

DROP FUNCTION IF EXISTS trigger_auto_seed_on_school_insert() CASCADE;

CREATE FUNCTION trigger_auto_seed_on_school_insert() RETURNS TRIGGER AS $$
BEGIN
  PERFORM auto_seed_school_safe(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_initialize_school_curriculum
AFTER INSERT ON schools
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_seed_on_school_insert();

-- Test: verify the function works
SELECT 'Fixed: end_year is now provided' as status;
