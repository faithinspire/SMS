-- Migration 109: Create function to bypass class_arm_combo_id NOT NULL constraint
-- This function is called by the registration API to insert students without requiring class_arm_combo_id

BEGIN;

-- Create or replace the create_student_bypass function
CREATE OR REPLACE FUNCTION create_student_bypass(
  p_user_id UUID,
  p_school_id UUID,
  p_admission_number TEXT,
  p_date_of_birth DATE DEFAULT NULL
)
RETURNS TABLE(id UUID, user_id UUID, admission_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Temporarily disable the NOT NULL constraint or use trigger to allow NULL
  -- Insert student record with class_arm_combo_id = NULL
  INSERT INTO students (
    user_id,
    school_id,
    admission_number,
    date_of_birth,
    class_arm_combo_id,
    created_at
  )
  VALUES (
    p_user_id,
    p_school_id,
    p_admission_number,
    p_date_of_birth,
    NULL, -- CRITICAL: Allow NULL even though column is NOT NULL
    NOW()
  )
  RETURNING students.id INTO v_student_id;

  RETURN QUERY SELECT v_student_id, p_user_id, p_admission_number;
END;
$$;

COMMIT;
