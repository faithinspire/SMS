-- Migration 151: Populate Test Student Data
-- Purpose: Create test student users and student records with class assignments
-- Creates 20 students per class for each school

BEGIN;

-- Get list of schools and their class/arm combinations
WITH school_and_classes AS (
  SELECT DISTINCT 
    s.id as school_id,
    cac.id as class_arm_combo_id,
    c.name as class_name,
    a.name as arm_name
  FROM schools s
  CROSS JOIN class_arm_combos cac
  JOIN classes c ON cac.class_id = c.id
  JOIN arms a ON cac.arm_id = a.id
  WHERE s.id IS NOT NULL
)

-- Generate student users (20 per class)
INSERT INTO users (school_id, full_name, email, role, status, gender, phone, address, state, lga, created_at, updated_at)
SELECT 
  sac.school_id,
  CONCAT(
    CASE 
      WHEN (ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) % 2 = 0 
      THEN 'Miss ' ELSE 'Mr. ' 
    END,
    CASE (ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) % 15
      WHEN 1 THEN 'Chioma Adeyemi'
      WHEN 2 THEN 'Oluwaseun Okafor'
      WHEN 3 THEN 'Blessing Okonkwo'
      WHEN 4 THEN 'Tosin Balogun'
      WHEN 5 THEN 'Zainab Abdulrahman'
      WHEN 6 THEN 'Emeka Nwosu'
      WHEN 7 THEN 'Amarachi Eze'
      WHEN 8 THEN 'Fatima Hassan'
      WHEN 9 THEN 'David Okafor'
      WHEN 10 THEN 'Ngozi Iheanachor'
      WHEN 11 THEN 'Kunle Adebayo'
      WHEN 12 THEN 'Hauwa Ibrahim'
      WHEN 13 THEN 'Chimezie Obi'
      WHEN 14 THEN 'Aisha Mohammed'
      ELSE 'Samuel Adekunle'
    END,
    ' ',
    LPAD(CAST((ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) AS TEXT), 3, '0')
  ),
  CONCAT(
    'student-',
    sac.school_id, '-',
    sac.class_arm_combo_id, '-',
    LPAD(CAST((ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) AS TEXT), 3, '0'),
    '@school.local'
  ),
  'STUDENT',
  'ACTIVE',
  CASE WHEN (ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) % 2 = 0 THEN 'Female' ELSE 'Male' END,
  CONCAT('+234801234', LPAD(CAST((ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) + 100 AS TEXT), 2, '0')),
  CONCAT(LPAD(CAST((ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) AS TEXT), 3, '0'), ' School Street'),
  CASE (ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) % 5
    WHEN 0 THEN 'Lagos'
    WHEN 1 THEN 'Ogun'
    WHEN 2 THEN 'Oyo'
    WHEN 3 THEN 'Osun'
    ELSE 'Ondo'
  END,
  CASE (ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id)) % 5
    WHEN 0 THEN 'Ikeja'
    WHEN 1 THEN 'Abeokuta'
    WHEN 2 THEN 'Ibadan'
    WHEN 3 THEN 'Osogbo'
    ELSE 'Akure'
  END,
  NOW(),
  NOW()
FROM (
  SELECT sac.*, ROW_NUMBER() OVER (PARTITION BY sac.school_id, sac.class_arm_combo_id ORDER BY sac.school_id) as student_num
  FROM school_and_classes sac
  CROSS JOIN (
    SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
    SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
  ) nums(n)
) sac
WHERE student_num <= 20
ON CONFLICT (email) DO NOTHING;

-- Create student records linked to users and class_arm_combos
WITH new_students AS (
  SELECT 
    u.id as user_id,
    u.school_id,
    u.full_name,
    u.email,
    sac.class_arm_combo_id,
    CONCAT('ADM-', u.school_id, '-', LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY u.school_id, sac.class_arm_combo_id ORDER BY u.created_at) AS TEXT), 5, '0')) as admission_number
  FROM users u
  CROSS JOIN school_and_classes sac
  WHERE u.role = 'STUDENT' 
    AND u.status = 'ACTIVE'
    AND u.created_at >= NOW() - INTERVAL '5 minutes'
    AND SUBSTRING_INDEX(u.email, '-', 3) = CONCAT('student-', u.school_id)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY sac.class_arm_combo_id) = 1
)

INSERT INTO students (user_id, school_id, class_arm_combo_id, admission_number, status, date_of_birth, created_at, updated_at)
SELECT 
  user_id,
  school_id,
  class_arm_combo_id,
  admission_number,
  'ACTIVE',
  DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 3650) + 5840 DAY),  -- Random DOB between 15-25 years old
  NOW(),
  NOW()
FROM new_students
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
