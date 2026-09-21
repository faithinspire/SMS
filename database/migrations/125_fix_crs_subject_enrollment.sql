-- ============================================================================
-- Migration 125: Fix CRS Subject Enrollment for Senior Classes
-- ============================================================================
-- Problem:
-- 1. CRS has duplicate records (CRS and CRS_SS with different codes)
-- 2. CRS has no teacher assignments for senior classes
-- 3. Students not enrolled in CRS despite applicable_to_levels containing SS1-3
--
-- Solution:
-- 1. Keep one CRS record (consolidate)
-- 2. Assign CRS to all senior class teachers
-- 3. Re-enroll all senior students in CRS
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Consolidate CRS Records (Keep 'CRS_SS', delete old 'CRS')
-- ============================================================================
-- First, identify duplicate CRS records
SELECT 
  'STEP 1: Before Consolidation' as step,
  COUNT(*) as crs_record_count,
  ARRAY_AGG(DISTINCT code) as crs_codes
FROM subjects
WHERE name = 'Christian Religious Studies'
AND school_id IN (SELECT id FROM schools LIMIT 1);

-- Delete old CRS records (keep CRS_SS which is more specific for SS)
DELETE FROM subjects
WHERE name = 'Christian Religious Studies'
  AND code = 'CRS'
  AND NOT EXISTS (
    SELECT 1 FROM subject_teacher_assignments sta
    WHERE sta.subject_id = subjects.id
  );

-- ============================================================================
-- STEP 2: Ensure CRS exists for all schools
-- ============================================================================
INSERT INTO subjects (school_id, name, code, applicable_to_levels, is_active, section, subject_category, compulsory)
SELECT 
  s.id,
  'Christian Religious Studies',
  'CRS',
  ARRAY[12, 13, 14],
  TRUE,
  'RELIGIOUS',
  'CORE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE school_id = s.id AND name = 'Christian Religious Studies' AND 12 = ANY(applicable_to_levels)
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Assign CRS to all class teachers for Senior Classes (SS1-SS3)
-- ============================================================================
INSERT INTO subject_teacher_assignments (school_id, subject_id, class_arm_combo_id, teacher_id)
SELECT DISTINCT
  cac.school_id,
  (SELECT id FROM subjects WHERE school_id = cac.school_id AND name = 'Christian Religious Studies' LIMIT 1),
  cac.id,
  cac.class_teacher_id
FROM class_arm_combos cac
JOIN classes c ON cac.class_id = c.id
WHERE c.level IN (12, 13, 14)
  AND cac.class_teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM subject_teacher_assignments sta
    WHERE sta.subject_id = (SELECT id FROM subjects WHERE school_id = cac.school_id AND name = 'Christian Religious Studies' LIMIT 1)
      AND sta.class_arm_combo_id = cac.id
      AND sta.teacher_id = cac.class_teacher_id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: Enroll all senior students in CRS
-- ============================================================================
INSERT INTO student_subjects (student_id, subject_id, school_id, subject_teacher_id)
SELECT DISTINCT
  st.id as student_id,
  s.id as subject_id,
  st.school_id,
  cac.class_teacher_id as subject_teacher_id
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
JOIN classes c ON cac.class_id = c.id
JOIN subjects s ON s.school_id = st.school_id AND s.name = 'Christian Religious Studies' AND 12 = ANY(s.applicable_to_levels)
WHERE c.level IN (12, 13, 14)
  AND NOT EXISTS (
    SELECT 1 FROM student_subjects ss
    WHERE ss.student_id = st.id AND ss.subject_id = s.id
  )
ON CONFLICT (student_id, subject_id) DO UPDATE SET
  subject_teacher_id = EXCLUDED.subject_teacher_id;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================
SELECT 
  'STEP 5: CRS Enrollment Verification' as verification,
  (SELECT COUNT(*) FROM subjects WHERE name = 'Christian Religious Studies') as total_crs_records,
  (SELECT COUNT(*) FROM subject_teacher_assignments sta JOIN subjects s ON sta.subject_id = s.id WHERE s.name = 'Christian Religious Studies') as crs_teacher_assignments,
  (SELECT COUNT(*) FROM student_subjects ss JOIN subjects s ON ss.subject_id = s.id WHERE s.name = 'Christian Religious Studies') as students_enrolled_in_crs,
  (SELECT COUNT(*) FROM students s JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id JOIN classes c ON cac.class_id = c.id WHERE c.level IN (12, 13, 14)) as total_senior_students;

COMMIT;
