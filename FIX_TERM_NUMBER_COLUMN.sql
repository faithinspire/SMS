-- ============================================================================
-- FIX: Use term_number instead of term_name
-- The academic_terms table uses term_number, not term_name
-- ============================================================================

DROP FUNCTION IF EXISTS safe_insert_academic_term(UUID, UUID, VARCHAR, INT, DATE, DATE, BOOLEAN) CASCADE;

CREATE FUNCTION safe_insert_academic_term(
  p_school_id UUID,
  p_session_id UUID,
  p_term_name VARCHAR,
  p_term_number INT,
  p_start_date DATE,
  p_end_date DATE,
  p_is_active BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_term_id UUID;
BEGIN
  SELECT id INTO v_term_id FROM academic_terms
  WHERE session_id = p_session_id 
    AND term_number = p_term_number
  LIMIT 1;
  
  IF v_term_id IS NOT NULL THEN
    RETURN v_term_id;
  END IF;
  
  -- Use term_number instead of term_name
  INSERT INTO academic_terms (school_id, session_id, term_number, start_date, end_date, is_active, created_at, updated_at)
  VALUES (p_school_id, p_session_id, p_term_number, p_start_date, p_end_date, p_is_active, NOW(), NOW())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_term_id;
  
  IF v_term_id IS NULL THEN
    SELECT id INTO v_term_id FROM academic_terms
    WHERE session_id = p_session_id 
      AND term_number = p_term_number
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_term_id, gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to use the fixed function
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

-- Update the auto_seed_school_safe function to pass correct parameters
DROP FUNCTION IF EXISTS auto_seed_school_safe(UUID) CASCADE;

CREATE FUNCTION auto_seed_school_safe(p_school_id UUID) RETURNS VOID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  v_session_id := safe_insert_academic_session(p_school_id, '2024/2025', 2024, true);
  
  IF v_session_id IS NOT NULL THEN
    -- Use term_number (1, 2, 3) not term_name
    PERFORM safe_insert_academic_term(p_school_id, v_session_id, 'First Term', 1, '2024-09-01'::DATE, '2024-11-30'::DATE, true);
    PERFORM safe_insert_academic_term(p_school_id, v_session_id, 'Second Term', 2, '2024-12-01'::DATE, '2025-02-28'::DATE, false);
    PERFORM safe_insert_academic_term(p_school_id, v_session_id, 'Third Term', 3, '2025-03-01'::DATE, '2025-05-31'::DATE, false);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT 'Fixed: Now using term_number column correctly' as status;
