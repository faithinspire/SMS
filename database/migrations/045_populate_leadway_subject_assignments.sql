-- ============================================================================
-- MIGRATION 045: Populate subject_teacher_assignments for LeadWay School
-- ============================================================================
-- PURPOSE: Ensure all teachers have proper subject assignments
--
-- This migration:
-- 1. Finds all class teachers at LeadWay School
-- 2. Gets all subjects applicable to their classes
-- 3. Creates subject_teacher_assignments for each class
-- ============================================================================

-- Get LeadWay School ID (this is a safe query that will find the school)
WITH leadway_school AS (
  SELECT id FROM schools WHERE name ILIKE '%leadway%' LIMIT 1
),

-- Get all class teachers and their classes at LeadWay School
class_teachers AS (
  SELECT 
    cac.class_teacher_id,
    cac.id as class_arm_combo_id,
    cac.class_id,
    cac.arm_id,
    cac.school_id
  FROM class_arm_combos cac
  WHERE cac.school_id = (SELECT id FROM leadway_school)
    AND cac.class_teacher_id IS NOT NULL
),

-- Get all subjects applicable to each class (via class_level join)
class_subjects AS (
  SELECT 
    ct.class_teacher_id,
    ct.class_arm_combo_id,
    ct.school_id,
    s.id as subject_id
  FROM class_teachers ct
  JOIN classes c ON c.id = ct.class_id
  JOIN subjects s ON s.school_id = ct.school_id
    AND s.applicable_to_levels @> ARRAY[c.level]
  WHERE ct.school_id = (SELECT id FROM leadway_school)
)

-- Insert into subject_teacher_assignments (avoiding duplicates)
INSERT INTO subject_teacher_assignments (
  teacher_id,
  subject_id,
  class_arm_combo_id,
  school_id,
  assigned_at
)
SELECT 
  class_teacher_id,
  subject_id,
  class_arm_combo_id,
  school_id,
  NOW()
FROM class_subjects
ON CONFLICT (school_id, teacher_id, subject_id, class_arm_combo_id) 
  DO NOTHING;

-- ============================================================================
-- Verify Results
-- ============================================================================

-- Check how many assignments were created
SELECT 
  COUNT(*) as total_assignments,
  COUNT(DISTINCT teacher_id) as teachers_with_assignments,
  COUNT(DISTINCT subject_id) as unique_subjects
FROM subject_teacher_assignments sta
WHERE sta.school_id = (SELECT id FROM schools WHERE name ILIKE '%leadway%' LIMIT 1);

-- Show assignments by teacher
SELECT 
  u.full_name as teacher_name,
  s.name as subject_name,
  c.name as class_name,
  arm.name as arm_name,
  COUNT(*) as assignment_count
FROM subject_teacher_assignments sta
JOIN users u ON u.id = sta.teacher_id
JOIN subjects s ON s.id = sta.subject_id
JOIN class_arm_combos cac ON cac.id = sta.class_arm_combo_id
JOIN classes c ON c.id = cac.class_id
JOIN arms arm ON arm.id = cac.arm_id
WHERE sta.school_id = (SELECT id FROM schools WHERE name ILIKE '%leadway%' LIMIT 1)
GROUP BY u.id, u.full_name, s.id, s.name, c.id, c.name, arm.id, arm.name
ORDER BY u.full_name, s.name, c.name;
