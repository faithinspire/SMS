-- AUTO FIX: Assign Lucky Idudu to a class at Ruachmodel and make students visible
-- This is a COMPLETE fix - run this entire script

-- ============================================================================
-- PART 1: FIND LUCKY AND HIS SCHOOL
-- ============================================================================

WITH lucky_search AS (
  SELECT 
    u.id as teacher_id,
    u.full_name,
    u.school_id,
    s.name as school_name
  FROM users u
  JOIN schools s ON u.school_id = s.id
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') 
    AND u.role = 'TEACHER'
    AND s.name ILIKE '%Ruachmodel%'
),

-- ============================================================================
-- PART 2: FIND AN AVAILABLE CLASS AT RUACHMODEL
-- ============================================================================

target_class AS (
  SELECT DISTINCT
    cac.id as class_combo_id,
    c.id as class_id,
    c.name as class_name,
    arm.name as arm_name,
    c.school_id,
    c.level as class_level,
    u.full_name as current_teacher
  FROM class_arm_combos cac
  JOIN classes c ON cac.class_id = c.id
  JOIN arms arm ON cac.arm_id = arm.id
  JOIN schools s ON c.school_id = s.id
  LEFT JOIN users u ON cac.class_teacher_id = u.id
  WHERE s.name ILIKE '%Ruachmodel%'
  ORDER BY c.name, arm.name
  LIMIT 1
),

-- ============================================================================
-- PART 3: ASSIGN LUCKY TO THE CLASS
-- ============================================================================

assign_lucky AS (
  UPDATE class_arm_combos cac
  SET class_teacher_id = (SELECT teacher_id FROM lucky_search)
  FROM target_class tc
  WHERE cac.id = tc.class_combo_id
  RETURNING cac.id as updated_combo_id
),

-- ============================================================================
-- PART 4: GET ALL SUBJECTS FOR THIS CLASS LEVEL
-- ============================================================================

applicable_subjects AS (
  SELECT DISTINCT
    s.id as subject_id,
    s.name as subject_name
  FROM subjects s
  CROSS JOIN target_class tc
  WHERE s.applicable_to_levels && ARRAY[tc.class_level]
),

-- ============================================================================
-- PART 5: ADD SUBJECT ASSIGNMENTS FOR LUCKY
-- ============================================================================

assign_subjects AS (
  INSERT INTO subject_teacher_assignments (teacher_id, subject_id, class_arm_combo_id, school_id)
  SELECT 
    ls.teacher_id,
    ap.subject_id,
    tc.class_combo_id,
    tc.school_id
  FROM lucky_search ls
  CROSS JOIN target_class tc
  CROSS JOIN applicable_subjects ap
  WHERE NOT EXISTS (
    SELECT 1 FROM subject_teacher_assignments sta
    WHERE sta.teacher_id = ls.teacher_id
      AND sta.subject_id = ap.subject_id
      AND sta.class_arm_combo_id = tc.class_combo_id
  )
  ON CONFLICT DO NOTHING
  RETURNING 1
),

-- ============================================================================
-- PART 6: ENROLL ALL STUDENTS IN LUCKY'S CLASS INTO HIS SUBJECTS
-- ============================================================================

enroll_students AS (
  INSERT INTO student_subjects (student_id, subject_id, school_id)
  SELECT 
    st.id as student_id,
    sta.subject_id,
    st.school_id
  FROM students st
  JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
  JOIN subject_teacher_assignments sta ON sta.class_arm_combo_id = cac.id
  WHERE sta.teacher_id IN (SELECT teacher_id FROM lucky_search)
    AND NOT EXISTS (
      SELECT 1 FROM student_subjects ss
      WHERE ss.student_id = st.id 
        AND ss.subject_id = sta.subject_id
    )
  ON CONFLICT DO NOTHING
  RETURNING 1
)

-- ============================================================================
-- PART 7: FINAL VERIFICATION AND REPORTING
-- ============================================================================

SELECT 'BEFORE & AFTER FIX REPORT' as report_type;

SELECT 
  '1. LUCKY PROFILE' as section,
  u.full_name as full_name,
  u.role as role,
  s.name as school
FROM users u
JOIN schools s ON u.school_id = s.id
WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'

UNION ALL

SELECT 
  '2. CLASS ASSIGNED TO LUCKY' as section,
  c.name || ' ' || arm.name as full_name,
  'CLASS' as role,
  s.name as school
FROM class_arm_combos cac
JOIN classes c ON cac.class_id = c.id
JOIN arms arm ON cac.arm_id = arm.id
JOIN schools s ON c.school_id = s.id
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)

UNION ALL

SELECT 
  '3. SUBJECTS TAUGHT BY LUCKY' as section,
  subj.name as full_name,
  'SUBJECT' as role,
  '' as school
FROM subject_teacher_assignments sta
JOIN subjects subj ON sta.subject_id = subj.id
WHERE sta.teacher_id IN (
  SELECT u.id FROM users u
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)

UNION ALL

SELECT 
  '4. STUDENTS IN LUCKY''S CLASS' as section,
  COUNT(DISTINCT st.id)::text as full_name,
  'COUNT' as role,
  '' as school
FROM students st
JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)

ORDER BY section DESC;

-- ============================================================================
-- PART 8: SHOW STUDENT DETAILS
-- ============================================================================

SELECT 'STUDENT DETAILS FOR LUCKY' as report_type;

SELECT 
  u.full_name as student_name,
  st.admission_number,
  c.name || ' ' || arm.name as class,
  COUNT(DISTINCT ss.subject_id) as subjects_enrolled
FROM students st
LEFT JOIN users u ON st.user_id = u.id
LEFT JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms arm ON cac.arm_id = arm.id
LEFT JOIN student_subjects ss ON ss.student_id = st.id
WHERE cac.class_teacher_id IN (
  SELECT u.id FROM users u
  WHERE (u.full_name ILIKE '%Lucky%' OR u.full_name ILIKE '%idudu%') AND u.role = 'TEACHER'
)
GROUP BY st.id, u.full_name, st.admission_number, c.name, arm.name
ORDER BY u.full_name;
