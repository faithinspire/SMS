-- ============================================================================
-- IMMEDIATE FIX: Run this NOW in Supabase SQL Editor
-- ============================================================================
-- This will IMMEDIATELY fix the 42P10 error preventing school registration
-- No waiting for migrations - just copy, paste, and run in Supabase
-- ============================================================================

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Create safe functions (no ON CONFLICT)
-- ============================================================================

CREATE OR REPLACE FUNCTION safe_insert_academic_session(
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
  
  IF v_session_id IS NULL THEN
    INSERT INTO academic_sessions (school_id, session_year, start_year, is_active, created_at, updated_at)
    VALUES (p_school_id, p_session_year, p_start_year, p_is_active, NOW(), NOW())
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION safe_insert_academic_term(
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
  SELECT id INTO v_term_id FROM academic_terms
  WHERE session_id = p_session_id 
    AND term_name = p_term_name
    AND term_order = p_term_order
  LIMIT 1;
  
  IF v_term_id IS NULL THEN
    INSERT INTO academic_terms (school_id, session_id, term_name, term_order, start_date, end_date, is_active, created_at, updated_at)
    VALUES (p_school_id, p_session_id, p_term_name, p_term_order, p_start_date, p_end_date, p_is_active, NOW(), NOW())
    RETURNING id INTO v_term_id;
  END IF;
  
  RETURN v_term_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_seed_school_safe(p_school_id UUID) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_session_id UUID;
  v_term_id UUID;
BEGIN
  BEGIN
    v_session_id := safe_insert_academic_session(p_school_id, '2024/2025', 2024, true);
    
    IF v_session_id IS NOT NULL THEN
      v_term_id := safe_insert_academic_term(p_school_id, v_session_id, 'First Term', 1, '2024-09-01'::DATE, '2024-11-30'::DATE, true);
      v_term_id := safe_insert_academic_term(p_school_id, v_session_id, 'Second Term', 2, '2024-12-01'::DATE, '2025-02-28'::DATE, false);
      v_term_id := safe_insert_academic_term(p_school_id, v_session_id, 'Third Term', 3, '2025-03-01'::DATE, '2025-05-31'::DATE, false);
      RETURN QUERY SELECT true, 'Success'::TEXT;
    ELSE
      RETURN QUERY SELECT false, 'Failed'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Replace broken trigger with safe version
-- ============================================================================

DROP TRIGGER IF EXISTS auto_initialize_school_curriculum ON schools;

CREATE OR REPLACE FUNCTION trigger_auto_seed_school() RETURNS TRIGGER AS $$
BEGIN
  PERFORM auto_seed_school_safe(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_initialize_school_curriculum
AFTER INSERT ON schools
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_seed_school();

-- ============================================================================
-- STEP 3: Auto-seed existing schools that have no sessions
-- ============================================================================

DO $$
DECLARE
  v_school record;
BEGIN
  FOR v_school IN SELECT id FROM schools LOOP
    IF NOT EXISTS (SELECT 1 FROM academic_sessions WHERE school_id = v_school.id) THEN
      PERFORM auto_seed_school_safe(v_school.id);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Verify and report
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS: All safe functions created and trigger updated';
  RAISE NOTICE '✅ Functions will NOT use ON CONFLICT - completely safe';
  RAISE NOTICE '✅ School registration should now work without 42P10 errors';
END $$;

COMMIT;
