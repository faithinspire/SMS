-- AUTO FIX SCRIPT - Run all of this in Supabase SQL Editor

-- ============================================================================
-- PART 1: CREATE MISSING TERMS (if needed)
-- ============================================================================

-- Check current terms
SELECT 'BEFORE FIX: Current terms' as status;
SELECT COUNT(*) as term_count, 
  (SELECT COUNT(DISTINCT school_id) FROM terms) as schools_with_terms,
  (SELECT COUNT(*) FROM schools) as total_schools
FROM terms;

-- Create terms for schools that don't have any
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current)
SELECT 
  s.id,
  term_data.name,
  term_data.session_year,
  term_data.start_date,
  term_data.end_date,
  term_data.is_current
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term', 2024, '2024-09-01'::date, '2024-11-30'::date, true),
    ('Second Term', 2024, '2024-12-01'::date, '2025-02-28'::date, false),
    ('Third Term', 2024, '2025-03-01'::date, '2025-05-31'::date, false)
) AS term_data(name, session_year, start_date, end_date, is_current)
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.school_id = s.id 
  AND t.name = term_data.name
  AND t.session_year = term_data.session_year
)
ON CONFLICT DO NOTHING;

-- Verify terms created
SELECT 'AFTER FIX: Verify terms created' as status;
SELECT COUNT(*) as term_count, 
  (SELECT COUNT(DISTINCT school_id) FROM terms) as schools_with_terms,
  (SELECT COUNT(*) FROM schools) as total_schools
FROM terms;

-- Show terms by school
SELECT 'TERMS BY SCHOOL' as section;
SELECT s.name as school_name, COUNT(t.id) as term_count, 
  STRING_AGG(t.name || ' (' || t.session_year || ')', ', ' ORDER BY t.session_year DESC, t.name) as terms
FROM schools s
LEFT JOIN terms t ON s.id = t.school_id
GROUP BY s.id, s.name
ORDER BY s.name;

-- ============================================================================
-- PART 2: FIX STUDENT SUBJECT ENROLLMENTS
-- ============================================================================

-- Check current enrollments
SELECT 'BEFORE FIX: Student subject enrollments' as status;
SELECT COUNT(*) as total_students_in_classes,
  (SELECT COUNT(*) FROM student_subjects) as students_in_subjects
FROM students;

-- Show students not enrolled in any subjects
SELECT 'STUDENTS WITHOUT SUBJECT ENROLLMENT' as section;
SELECT s.id as student_id, u.full_name, s.admission_number, 
  c.name || ' ' || arm.name as class
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms arm ON cac.arm_id = arm.id
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects ss WHERE ss.student_id = s.id
)
LIMIT 20;

-- Enroll students in subjects based on class level
INSERT INTO student_subjects (student_id, subject_id, school_id)
SELECT DISTINCT
  st.id as student_id,
  subj.id as subject_id,
  st.school_id
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
JOIN classes cls ON cac.class_id = cls.id
JOIN subjects subj ON cls.level = ANY(subj.applicable_to_levels)
WHERE NOT EXISTS (
  SELECT 1 FROM student_subjects ss
  WHERE ss.student_id = st.id AND ss.subject_id = subj.id
)
ON CONFLICT DO NOTHING;

-- Verify enrollments created
SELECT 'AFTER FIX: Verify student subject enrollments' as status;
SELECT COUNT(*) as total_students_in_classes,
  (SELECT COUNT(*) FROM student_subjects) as students_in_subjects
FROM students;

-- ============================================================================
-- PART 3: VERIFY LUCKY IDUDU CAN ACCESS STUDENTS
-- ============================================================================

SELECT 'VERIFICATION: LUCKY IDUDU ACCESS' as section;

-- Find Lucky Idudu
WITH lucky AS (
  SELECT u.id as teacher_id, u.full_name, s.name as school_name, s.id as school_id
  FROM users u
  JOIN schools s ON u.school_id = s.id
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)
SELECT 
  'LUCKY PROFILE' as check_type,
  l.full_name as name,
  l.school_name as school,
  (SELECT COUNT(*) FROM class_arm_combos WHERE class_teacher_id = l.teacher_id) as managed_classes,
  (SELECT COUNT(DISTINCT sta.subject_id) FROM subject_teacher_assignments sta WHERE sta.teacher_id = l.teacher_id) as taught_subjects
FROM lucky l
UNION ALL
-- Count students in Lucky's classes
SELECT 
  'STUDENTS IN CLASS' as check_type,
  '',
  '',
  COUNT(DISTINCT st.id) as count,
  0
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u 
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)
UNION ALL
-- Count students taking Lucky's subjects
SELECT 
  'STUDENTS IN SUBJECT' as check_type,
  '',
  '',
  COUNT(DISTINCT ss.student_id) as count,
  0
FROM student_subjects ss
WHERE ss.subject_id IN (
  SELECT sta.subject_id FROM subject_teacher_assignments sta
  WHERE sta.teacher_id IN (
    SELECT u.id FROM users u 
    WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
  )
);

-- Show detailed students for Lucky
SELECT 'LUCKY''S STUDENTS DETAIL' as section;
WITH lucky AS (
  SELECT u.id as teacher_id, u.full_name
  FROM users u
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)
SELECT 
  l.full_name as teacher,
  c.name || ' ' || arm.name as class,
  u.full_name as student_name,
  st.admission_number,
  COUNT(DISTINCT ss.id) as subjects_enrolled
FROM lucky l
JOIN class_arm_combos cac ON cac.class_teacher_id = l.teacher_id
JOIN classes c ON cac.class_id = c.id
JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN students st ON st.class_arm_combo_id = cac.id
LEFT JOIN users u ON st.user_id = u.id
LEFT JOIN student_subjects ss ON ss.student_id = st.id
GROUP BY l.teacher_id, l.full_name, cac.id, c.name, arm.name, u.full_name, st.admission_number, st.id
ORDER BY c.name, arm.name, u.full_name;

-- ============================================================================
-- PART 4: SUMMARY
-- ============================================================================

SELECT 'FINAL SUMMARY' as section;
SELECT 
  s.name as school,
  (SELECT COUNT(*) FROM terms WHERE school_id = s.id) as term_count,
  (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.role = 'TEACHER') as teachers,
  (SELECT COUNT(*) FROM students WHERE school_id = s.id) as total_students,
  (SELECT COUNT(*) FROM student_subjects WHERE school_id = s.id) as students_with_subjects
FROM schools s
ORDER BY s.name;
