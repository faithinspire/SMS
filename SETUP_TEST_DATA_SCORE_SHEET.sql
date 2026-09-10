-- Setup Test Data for Score Sheet System
-- This creates test data to demonstrate the Score Sheet functionality

-- Step 1: Get the logged-in teacher's ID (replace with actual teacher UUID from your database)
-- First, find the teacher user ID from the users table
-- SELECT id, full_name, email FROM users WHERE role = 'TEACHER' LIMIT 1;

-- Step 2: Get the school ID (find from schools table)
-- SELECT id, name FROM schools LIMIT 1;

-- Step 3: Get or create a class_arm_combo
-- SELECT id FROM class_arm_combos LIMIT 1;

-- For this example, we'll assume:
-- Teacher ID: (you'll need to replace with actual)
-- School ID: (you'll need to replace with actual)
-- Class Arm Combo ID: (you'll need to replace with actual)

-- CREATE teacher assignments if not exists
-- INSERT INTO teacher_assignments (school_id, teacher_id, subject_id, class_arm_combo_id)
-- SELECT 
--   schools.id as school_id,
--   users.id as teacher_id,
--   subjects.id as subject_id,
--   class_arm_combos.id as class_arm_combo_id
-- FROM users
-- CROSS JOIN schools
-- CROSS JOIN subjects
-- CROSS JOIN class_arm_combos
-- WHERE users.role = 'TEACHER' 
--   AND users.full_name LIKE '%John%' -- Replace with your teacher name
--   AND schools.name LIKE '%LEADWAY%' -- Replace with your school name
--   AND subjects.name IN ('Mathematics', 'English', 'Physics')
--   AND class_arm_combos.id = (SELECT id FROM class_arm_combos LIMIT 1)
-- ON CONFLICT DO NOTHING;

-- CREATE student subject enrollments if not exists
-- INSERT INTO student_subject_enrollment (school_id, student_id, subject_id, class_arm_combo_id)
-- SELECT 
--   schools.id as school_id,
--   students.id as student_id,
--   subjects.id as subject_id,
--   students.class_arm_combo_id
-- FROM students
-- CROSS JOIN schools
-- CROSS JOIN subjects
-- WHERE schools.id = students.school_id
--   AND subjects.name IN ('Mathematics', 'English', 'Physics')
--   AND students.class_arm_combo_id = (SELECT id FROM class_arm_combos LIMIT 1)
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- MANUAL SETUP INSTRUCTIONS
-- ============================================================================
-- 
-- To set up test data for Score Sheet:
--
-- 1. Log in to Supabase dashboard for your project
--
-- 2. Go to SQL Editor and run these commands:
--
--    A) First, get the actual IDs you need:
--       SELECT id, full_name FROM users WHERE role = 'TEACHER' LIMIT 5;
--       SELECT id, name FROM schools LIMIT 5;
--       SELECT id FROM class_arm_combos LIMIT 5;
--       SELECT id, name FROM subjects LIMIT 10;
--       SELECT id, admission_number FROM students LIMIT 10;
--
--    B) Once you have the IDs, run these INSERT statements (replace XXX with actual IDs):
--
--       INSERT INTO teacher_assignments (school_id, teacher_id, subject_id, class_arm_combo_id)
--       VALUES 
--       ('SCHOOL_ID', 'TEACHER_ID', 'SUBJECT_ID_1', 'CLASS_COMBO_ID'),
--       ('SCHOOL_ID', 'TEACHER_ID', 'SUBJECT_ID_2', 'CLASS_COMBO_ID'),
--       ('SCHOOL_ID', 'TEACHER_ID', 'SUBJECT_ID_3', 'CLASS_COMBO_ID');
--
--       INSERT INTO student_subject_enrollment (school_id, student_id, subject_id, class_arm_combo_id)
--       VALUES 
--       ('SCHOOL_ID', 'STUDENT_ID_1', 'SUBJECT_ID_1', 'CLASS_COMBO_ID'),
--       ('SCHOOL_ID', 'STUDENT_ID_2', 'SUBJECT_ID_1', 'CLASS_COMBO_ID'),
--       ('SCHOOL_ID', 'STUDENT_ID_1', 'SUBJECT_ID_2', 'CLASS_COMBO_ID'),
--       ('SCHOOL_ID', 'STUDENT_ID_2', 'SUBJECT_ID_2', 'CLASS_COMBO_ID');
--
-- 3. After running these, the Score Sheet page will show:
--    - Classes dropdown populated with class_arm_combos you assigned
--    - Students in those classes
--    - Subjects they can enter scores for
--
-- ============================================================================

-- Alternative: Query to see current data structure
SELECT 'Teacher Assignments' as check_name, COUNT(*) as count FROM teacher_assignments;
SELECT 'Class Arm Combos' as check_name, COUNT(*) as count FROM class_arm_combos;
SELECT 'Students' as check_name, COUNT(*) as count FROM students;
SELECT 'Student Subject Enrollment' as check_name, COUNT(*) as count FROM student_subject_enrollment;
SELECT 'Subjects' as check_name, COUNT(*) as count FROM subjects;
SELECT 'Teachers (users with TEACHER role)' as check_name, COUNT(*) as count FROM users WHERE role = 'TEACHER';
