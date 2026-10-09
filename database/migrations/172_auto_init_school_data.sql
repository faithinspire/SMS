-- Migration 172: Automatic School Data Initialization
-- Creates a function to automatically provision all academic data for newly created schools

BEGIN;

-- ============================================================================
-- Function: Initialize Complete Academic Data for a School
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_school_data(p_school_id UUID)
RETURNS TABLE (
  sessions_created INT,
  terms_created INT,
  classes_created INT,
  arms_created INT,
  combos_created INT,
  subjects_created INT,
  success BOOLEAN
)
AS $$
DECLARE
  v_session_id UUID;
  v_year INT;
  v_term_num INT;
  v_class_id UUID;
  v_arm_id UUID;
  v_sessions_count INT := 0;
  v_terms_count INT := 0;
  v_classes_count INT := 0;
  v_arms_count INT := 0;
  v_combos_count INT := 0;
  v_subjects_count INT := 0;
  v_success BOOLEAN := TRUE;
BEGIN
  -- Ensure school exists
  IF NOT EXISTS (SELECT 1 FROM schools WHERE id = p_school_id) THEN
    RAISE EXCEPTION 'School not found: %', p_school_id;
  END IF;

  -- STEP 1: Create academic sessions (2024-2040)
  FOR v_year IN 2024..2040 LOOP
    INSERT INTO academic_sessions (school_id, session_name, start_date, end_date, is_current, status)
    VALUES (
      p_school_id,
      v_year || '/' || (v_year + 1),
      (v_year || '-09-01')::DATE,
      ((v_year + 1) || '-08-31')::DATE,
      v_year = EXTRACT(YEAR FROM NOW())::INT,
      'ACTIVE'
    )
    ON CONFLICT (school_id, session_name) DO NOTHING;
    
    v_sessions_count := v_sessions_count + 1;
  END LOOP;

  -- STEP 2: Create terms for each session
  FOR v_session_id, v_year IN
    SELECT id, EXTRACT(YEAR FROM start_date)::INT
    FROM academic_sessions
    WHERE school_id = p_school_id
  LOOP
    FOR v_term_num IN 1..3 LOOP
      INSERT INTO terms (school_id, session_id, term_number, term_name, start_date, end_date, status)
      VALUES (
        p_school_id,
        v_session_id,
        v_term_num,
        'Term ' || v_term_num,
        (v_year || '-' || (8 + v_term_num * 3) || '-01')::DATE,
        (v_year || '-' || (11 + v_term_num * 3) || '-30')::DATE,
        'ACTIVE'
      )
      ON CONFLICT (school_id, session_id, term_number) DO NOTHING;
      
      v_terms_count := v_terms_count + 1;
    END LOOP;
  END LOOP;

  -- STEP 3: Create classes (JSS1-SS3)
  INSERT INTO classes (school_id, name, level, type, status)
  VALUES 
    (p_school_id, 'JSS1', 1, 'JUNIOR', 'ACTIVE'),
    (p_school_id, 'JSS2', 2, 'JUNIOR', 'ACTIVE'),
    (p_school_id, 'JSS3', 3, 'JUNIOR', 'ACTIVE'),
    (p_school_id, 'SS1', 4, 'SENIOR', 'ACTIVE'),
    (p_school_id, 'SS2', 5, 'SENIOR', 'ACTIVE'),
    (p_school_id, 'SS3', 6, 'SENIOR', 'ACTIVE')
  ON CONFLICT (school_id, name) DO NOTHING;
  
  v_classes_count := 6;

  -- STEP 4: Create arms (A-D) for each class
  FOR v_class_id IN SELECT id FROM classes WHERE school_id = p_school_id LOOP
    INSERT INTO arms (school_id, class_id, name, status)
    VALUES
      (p_school_id, v_class_id, 'A', 'ACTIVE'),
      (p_school_id, v_class_id, 'B', 'ACTIVE'),
      (p_school_id, v_class_id, 'C', 'ACTIVE'),
      (p_school_id, v_class_id, 'D', 'ACTIVE')
    ON CONFLICT (school_id, class_id, name) DO NOTHING;
    
    v_arms_count := v_arms_count + 4;
  END LOOP;

  -- STEP 5: Create class-arm combos
  INSERT INTO class_arm_combos (school_id, class_id, arm_id, class_teacher_id, status)
  SELECT p_school_id, c.id, a.id, NULL, 'ACTIVE'
  FROM classes c
  JOIN arms a ON a.class_id = c.id
  WHERE c.school_id = p_school_id AND a.school_id = p_school_id
  ON CONFLICT (school_id, class_id, arm_id) DO NOTHING;
  
  v_combos_count := (SELECT COUNT(*) FROM class_arm_combos WHERE school_id = p_school_id);

  -- STEP 6: Create standard subjects
  INSERT INTO subjects (school_id, code, name, subject_type, department, is_active)
  VALUES
    (p_school_id, 'ENG', 'English Language', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'MATH', 'Mathematics', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'SCIENCE', 'Science', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'SS', 'Social Studies', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'ICT', 'Information & Communication Technology', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'CRS', 'Christian Religious Studies', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'ISLAMIC', 'Islamic Studies', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'BUSINESS', 'Business Studies', 'ELECTIVE', 'ACADEMICS', TRUE),
    (p_school_id, 'ECONOMICS', 'Economics', 'ELECTIVE', 'ACADEMICS', TRUE),
    (p_school_id, 'GOVT', 'Government', 'CORE', 'ACADEMICS', TRUE),
    (p_school_id, 'CHEMISTRY', 'Chemistry', 'CORE', 'SCIENCE', TRUE),
    (p_school_id, 'PHYSICS', 'Physics', 'CORE', 'SCIENCE', TRUE),
    (p_school_id, 'BIOLOGY', 'Biology', 'CORE', 'SCIENCE', TRUE),
    (p_school_id, 'LITERATURE', 'Literature in English', 'ELECTIVE', 'ACADEMICS', TRUE),
    (p_school_id, 'HISTORY', 'History', 'ELECTIVE', 'ACADEMICS', TRUE),
    (p_school_id, 'GEOGRAPHY', 'Geography', 'ELECTIVE', 'ACADEMICS', TRUE),
    (p_school_id, 'PE', 'Physical Education', 'CORE', 'SPORTS', TRUE),
    (p_school_id, 'MUSIC', 'Music', 'ELECTIVE', 'ARTS', TRUE),
    (p_school_id, 'ART', 'Visual Art', 'ELECTIVE', 'ARTS', TRUE),
    (p_school_id, 'FRENCH', 'French Language', 'ELECTIVE', 'LANGUAGES', TRUE)
  ON CONFLICT (school_id, code) DO NOTHING;
  
  v_subjects_count := 20;

  -- STEP 7: Create score sheets for current term
  INSERT INTO score_sheets (school_id, class_id, arm_id, term_id, session_id, status)
  SELECT 
    p_school_id,
    c.id,
    a.id,
    t.id,
    s.id,
    'ACTIVE'
  FROM classes c
  JOIN arms a ON a.class_id = c.id
  JOIN academic_sessions s ON s.school_id = p_school_id AND s.is_current = TRUE
  JOIN terms t ON t.session_id = s.id AND t.term_number = 1
  WHERE c.school_id = p_school_id
  ON CONFLICT (school_id, class_id, arm_id, term_id) DO NOTHING;

  RETURN QUERY SELECT v_sessions_count, v_terms_count, v_classes_count, v_arms_count, v_combos_count, v_subjects_count, v_success;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: Auto-initialize data when a school is created
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_initialize_school()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically initialize data for new schools
  PERFORM initialize_school_data(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_initialize_school_data ON schools;

CREATE TRIGGER trg_initialize_school_data
AFTER INSERT ON schools
FOR EACH ROW
EXECUTE FUNCTION trigger_initialize_school();

COMMIT;

-- Verification queries
-- Check if trigger is active:
-- SELECT trigger_name FROM information_schema.triggers WHERE table_name = 'schools';

-- Test initialization for a school:
-- SELECT * FROM initialize_school_data('your-school-id');
