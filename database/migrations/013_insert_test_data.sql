-- ============================================================================
-- INSERT TEST DATA FOR REGISTRATION SYSTEM
-- This creates sample schools, classes, arms, and subjects for testing
-- ============================================================================

-- First, let's get or create a school (if doesn't exist)
-- We'll use a fixed UUID for our test school
INSERT INTO schools (id, name, type, email, phone, subscription_plan, status)
VALUES (
  '18459a61-7e93-494c-b951-6cef5d589a88'::UUID,
  'Faith Inspire Academy',
  'BOTH',
  'admin@faithinspire.com',
  '+234803456789',
  'premium',
  'ACTIVE'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE PRIMARY CLASSES
-- ============================================================================

INSERT INTO classes (id, school_id, name, level, type)
VALUES 
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 1', 1, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 2', 2, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 3', 3, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 4', 4, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 5', 5, 'PRIMARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Primary 6', 6, 'PRIMARY')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE SECONDARY CLASSES (JSS & SSS)
-- ============================================================================

INSERT INTO classes (id, school_id, name, level, type)
VALUES 
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'JSS 1', 7, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'JSS 2', 8, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'JSS 3', 9, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'SSS 1', 10, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'SSS 2', 11, 'SECONDARY'),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'SSS 3', 12, 'SECONDARY')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE ARMS (A, B, C)
-- ============================================================================

-- Get all class IDs and create arms for each
WITH class_ids AS (
  SELECT id FROM classes WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
)
INSERT INTO arms (id, class_id, school_id, name, capacity)
SELECT 
  gen_random_uuid(),
  c.id,
  '18459a61-7e93-494c-b951-6cef5d589a88'::UUID,
  arm.name,
  40
FROM class_ids c
CROSS JOIN (
  SELECT 'A' AS name
  UNION ALL SELECT 'B'
  UNION ALL SELECT 'C'
) arm
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE CLASS-ARM COMBINATIONS
-- ============================================================================

-- Insert class_arm_combos for all combinations
WITH class_arm_pairs AS (
  SELECT c.id as class_id, a.id as arm_id
  FROM classes c
  JOIN arms a ON a.class_id = c.id
  WHERE c.school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID
)
INSERT INTO class_arm_combos (id, school_id, class_id, arm_id)
SELECT gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, class_id, arm_id
FROM class_arm_pairs
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE NIGERIAN SUBJECTS - PRIMARY (Levels 1-6)
-- ============================================================================

INSERT INTO subjects (id, school_id, name, code, applicable_to_levels)
VALUES 
  -- Primary Subjects
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'English Language', 'ENG', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Mathematics', 'MATH', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Science', 'SCI', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Social Studies', 'SS', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Civic Education', 'CIV', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Physical Education', 'PE', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Art & Craft', 'ART', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Music', 'MUS', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Home Economics', 'HE', ARRAY[1,2,3,4,5,6]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Information Technology', 'ICT', ARRAY[3,4,5,6]),
  
  -- Secondary Subjects (JSS - Levels 7, 8, 9)
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'English', 'ENG', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Mathematics', 'MATH', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Biology', 'BIO', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Chemistry', 'CHEM', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Physics', 'PHY', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'History', 'HIST', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Geography', 'GEO', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Civic Education', 'CIV', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Physical Education', 'PE', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Agricultural Science', 'AGR', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Technical Drawing', 'TD', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Computer Science', 'CS', ARRAY[7,8,9,10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Economics', 'ECON', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Accounting', 'ACC', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Government', 'GOV', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Literature In English', 'LIT', ARRAY[10,11,12]),
  (gen_random_uuid(), '18459a61-7e93-494c-b951-6cef5d589a88'::UUID, 'Further Mathematics', 'FM', ARRAY[10,11,12])
ON CONFLICT (school_id, name) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify data was inserted)
-- ============================================================================

-- Check schools
-- SELECT COUNT(*) as school_count FROM schools;

-- Check classes
-- SELECT COUNT(*) as class_count FROM classes WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID;

-- Check arms
-- SELECT COUNT(*) as arm_count FROM arms WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID;

-- Check class_arm_combos
-- SELECT COUNT(*) as combo_count FROM class_arm_combos WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID;

-- Check subjects
-- SELECT COUNT(*) as subject_count FROM subjects WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID;

-- View all classes with their names
-- SELECT name, level, type FROM classes WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID ORDER BY level;

-- View all subjects
-- SELECT name, code, applicable_to_levels FROM subjects WHERE school_id = '18459a61-7e93-494c-b951-6cef5d589a88'::UUID ORDER BY name;
