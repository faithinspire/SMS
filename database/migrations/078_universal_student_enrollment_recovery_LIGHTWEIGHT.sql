-- Migration 078 LIGHTWEIGHT: Universal Student Enrollment Recovery
-- PURPOSE: Fix student loading WITHOUT creating temporary files (disk-safe)
-- This version uses IN-PLACE updates instead of large INSERT operations

-- ============================================================================
-- PART 1: Ensure all schools have default classes/subjects (IF not exists)
-- ============================================================================

-- Only for schools that have NO classes yet
DO $$
DECLARE
  school_rec RECORD;
BEGIN
  FOR school_rec IN 
    SELECT s.id, s.name 
    FROM schools s
    WHERE NOT EXISTS (SELECT 1 FROM classes WHERE school_id = s.id LIMIT 1)
    AND s.status = 'ACTIVE'
    LIMIT 10  -- Process only 10 at a time to avoid disk overload
  LOOP
    BEGIN
      RAISE NOTICE 'Populating default data for school: % (%)', school_rec.name, school_rec.id;
      PERFORM create_default_school_data(school_rec.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not populate school %: %', school_rec.id, SQLERROR_MESSAGE;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: Fix subjects with missing applicable_to_levels (IN-PLACE UPDATE)
-- ============================================================================

-- Update PRIMARY subjects to have correct applicable_to_levels
UPDATE subjects
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE school_id IN (SELECT id FROM schools WHERE type IN ('PRIMARY', 'BOTH'))
  AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}')
  AND LOWER(name) IN ('english language', 'english', 'mathematics', 'math', 'science', 
                       'social studies', 'civic education', 'physical education', 
                       'art & craft', 'music', 'home economics', 'information technology', 'ict')
LIMIT 100;

-- Update SECONDARY subjects to have correct applicable_to_levels
UPDATE subjects
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE school_id IN (SELECT id FROM schools WHERE type IN ('SECONDARY', 'BOTH'))
  AND (applicable_to_levels IS NULL OR applicable_to_levels = '{}')
LIMIT 100;

-- ============================================================================
-- PART 3: Auto-assign teachers to subjects (BATCH PROCESS - avoid disk overload)
-- ============================================================================

-- Process in small batches to avoid large temporary files
DO $$
DECLARE
  v_batch_size INT := 50;
  v_processed INT := 0;
  v_max_iterations INT := 100;
  v_iteration INT := 0;
BEGIN
  WHILE v_iteration < v_max_iterations LOOP
    INSERT INTO subject_teacher_assignments (id, school_id, subject_id, class_arm_combo_id, teacher_id)
    SELECT 
      gen_random_uuid(),
      cac.school_id,
      s.id,
      cac.id,
      cac.class_teacher_id
    FROM (
      -- Get only a small batch of assignments to create
      SELECT DISTINCT cac.id, cac.class_id, cac.class_teacher_id, cac.school_id
      FROM class_arm_combos cac
      WHERE cac.class_teacher_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM subject_teacher_assignments sta
          WHERE sta.class_arm_combo_id = cac.id
            AND sta.teacher_id = cac.class_teacher_id
          LIMIT 1
        )
      LIMIT v_batch_size
    ) batch_cac
    JOIN classes c ON batch_cac.class_id = c.id
    JOIN subjects s ON s.school_id = batch_cac.school_id
      AND s.applicable_to_levels && ARRAY[c.level]
    WHERE NOT EXISTS (
      SELECT 1 FROM subject_teacher_assignments sta
      WHERE sta.subject_id = s.id
        AND sta.class_arm_combo_id = batch_cac.id
        AND sta.teacher_id = batch_cac.class_teacher_id
        AND sta.school_id = batch_cac.school_id
    )
    ON CONFLICT DO NOTHING;

    v_processed := v_processed + v_batch_size;
    v_iteration := v_iteration + 1;
    
    -- If we didn't insert anything, we're done
    IF NOT FOUND THEN
      EXIT;
    END IF;
  END LOOP;
  RAISE NOTICE 'Completed teacher-subject assignment (iterations: %)', v_iteration;
END $$;

-- ============================================================================
-- PART 4: Retroactively enroll students (BATCH PROCESS - avoid disk overload)
-- ============================================================================

-- Process enrollments in small batches
DO $$
DECLARE
  v_batch_size INT := 100;
  v_iteration INT := 0;
  v_max_iterations INT := 200;
BEGIN
  WHILE v_iteration < v_max_iterations LOOP
    INSERT INTO student_subjects (id, student_id, subject_id, school_id)
    SELECT 
      gen_random_uuid(),
      st.id,
      s.id,
      st.school_id
    FROM (
      -- Get only a small batch of students needing enrollment
      SELECT DISTINCT st.id, st.school_id, cac.class_id
      FROM students st
      JOIN class_arm_combos cac ON st.class_arm_combo_id = cac.id
      WHERE NOT EXISTS (
        SELECT 1 FROM student_subjects ss
        WHERE ss.student_id = st.id LIMIT 1
      )
      LIMIT v_batch_size
    ) batch_st
    JOIN classes c ON batch_st.class_id = c.id
    JOIN subjects s ON s.school_id = batch_st.school_id
      AND s.applicable_to_levels && ARRAY[c.level]
    WHERE NOT EXISTS (
      SELECT 1 FROM student_subjects ss
      WHERE ss.student_id = batch_st.id 
        AND ss.subject_id = s.id
        AND ss.school_id = batch_st.school_id
    )
    ON CONFLICT DO NOTHING;

    v_iteration := v_iteration + 1;
    
    -- If we didn't insert anything, we're done
    IF NOT FOUND THEN
      EXIT;
    END IF;
  END LOOP;
  RAISE NOTICE 'Completed student enrollments (iterations: %)', v_iteration;
END $$;

-- ============================================================================
-- PART 5: Quick Verification (minimal disk usage)
-- ============================================================================

-- Count students per school (lightweight query)
SELECT 
  s.name as school_name,
  COUNT(DISTINCT st.id) as total_students,
  COUNT(DISTINCT ss.student_id) as enrolled_students,
  ROUND(100.0 * COUNT(DISTINCT ss.student_id) / NULLIF(COUNT(DISTINCT st.id), 0), 1) as enrollment_percent
FROM schools s
LEFT JOIN students st ON st.school_id = s.id
LEFT JOIN student_subjects ss ON ss.school_id = s.id
WHERE s.status = 'ACTIVE'
GROUP BY s.id, s.name
HAVING COUNT(DISTINCT st.id) > 0
ORDER BY enrollment_percent DESC;
