-- ============================================================================
-- RETROACTIVE STUDENT SUBJECT ENROLLMENT
-- ============================================================================
-- This script populates the student_subjects bridge table for all students
-- based on their class level and applicable subjects
-- ============================================================================

-- Insert subjects for students based on their class level
INSERT INTO student_subjects (student_id, subject_id, school_id)
SELECT DISTINCT
  st.id as student_id,
  s.id as subject_id,
  st.school_id
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN subjects s ON c.level = ANY(s.applicable_to_levels) AND s.school_id = st.school_id
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects ss
  WHERE ss.student_id = st.id AND ss.subject_id = s.id
)
ON CONFLICT DO NOTHING;

-- Verify the enrollment
SELECT 
  'Retroactive enrollment complete' as status,
  COUNT(DISTINCT st.id) as students_processed,
  COUNT(DISTINCT ss.subject_id) as total_subjects_assigned
FROM students st
LEFT JOIN student_subjects ss ON st.id = ss.student_id;
