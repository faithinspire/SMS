-- SQL Queries to Verify Data Integrity After Fixes
-- Run these in Supabase SQL Editor to diagnose any remaining issues

-- ============================================================================
-- PART 1: VERIFY SCHOOL DATA
-- ============================================================================

-- Check how many schools exist
SELECT COUNT(*) as total_schools FROM schools;

-- Check school admin has school_id
SELECT id, email, full_name, school_id, role 
FROM users 
WHERE role IN ('SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER') 
LIMIT 10;

-- ============================================================================
-- PART 2: VERIFY STUDENT-USER RELATIONSHIPS
-- ============================================================================

-- Check students table has proper user_id references
SELECT 
  s.id as student_id,
  s.user_id,
  s.admission_number,
  s.school_id,
  s.class_arm_combo_id,
  u.full_name,
  u.email
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LIMIT 20;

-- Check if any students have NULL user_id (data quality issue)
SELECT COUNT(*) as students_with_null_user_id 
FROM students 
WHERE user_id IS NULL;

-- Check if any students have NULL class_arm_combo_id
SELECT COUNT(*) as students_without_class 
FROM students 
WHERE class_arm_combo_id IS NULL;

-- ============================================================================
-- PART 3: VERIFY CLASS STRUCTURE
-- ============================================================================

-- Check class_arm_combos with their classes and arms
SELECT 
  cac.id as class_arm_combo_id,
  cac.school_id,
  cac.class_id,
  cac.arm_id,
  c.name as class_name,
  a.name as arm_name,
  COUNT(s.id) as student_count
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
GROUP BY cac.id, cac.school_id, cac.class_id, cac.arm_id, c.name, a.name
LIMIT 50;

-- ============================================================================
-- PART 4: VERIFY TRANSACTIONS DATA
-- ============================================================================

-- Check transactions exist for school
SELECT 
  school_id,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT recipient_id) as unique_recipients,
  COUNT(DISTINCT type) as transaction_types,
  SUM(amount) as total_amount
FROM transactions
GROUP BY school_id
LIMIT 10;

-- Check student payments specifically
SELECT 
  t.id,
  t.school_id,
  t.recipient_id,
  t.recipient_name,
  t.amount,
  t.status,
  t.created_at,
  s.admission_number,
  u.full_name as student_full_name
FROM transactions t
LEFT JOIN students s ON t.recipient_id = s.id
LEFT JOIN users u ON s.user_id = u.id
WHERE t.type = 'STUDENT_PAYMENT'
LIMIT 20;

-- Check staff salary transactions
SELECT 
  t.id,
  t.school_id,
  t.recipient_id,
  t.recipient_name,
  t.amount,
  t.status,
  t.created_at,
  u.full_name,
  u.role
FROM transactions t
LEFT JOIN users u ON t.recipient_id = u.id
WHERE t.type = 'STAFF_SALARY'
LIMIT 20;

-- ============================================================================
-- PART 5: VERIFY BROADCASTS
-- ============================================================================

-- Check broadcasts exist
SELECT 
  COUNT(*) as total_broadcasts,
  COUNT(DISTINCT school_id) as schools_with_broadcasts
FROM broadcasts;

-- Check broadcast data structure
SELECT 
  id,
  school_id,
  sender_id,
  sender_name,
  message,
  created_at
FROM broadcasts
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 6: FK RELATIONSHIP VERIFICATION
-- ============================================================================

-- Verify students-users FK exists and works
SELECT 
  COUNT(*) as students_with_valid_user_ref
FROM students s
WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);

-- Check for orphaned students (user deleted but student remains)
SELECT 
  s.id,
  s.user_id,
  s.admission_number
FROM students s
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);

-- ============================================================================
-- PART 7: DATA INTEGRITY SUMMARY
-- ============================================================================

-- Quick health check
SELECT 
  (SELECT COUNT(*) FROM schools) as total_schools,
  (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') as total_users_students,
  (SELECT COUNT(*) FROM students) as total_students_records,
  (SELECT COUNT(*) FROM class_arm_combos) as total_classes,
  (SELECT COUNT(*) FROM transactions) as total_transactions,
  (SELECT COUNT(*) FROM broadcasts) as total_broadcasts;

-- ============================================================================
-- PART 8: PERFORMANCE INDEXES CHECK
-- ============================================================================

-- Verify indexes exist for common queries
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- PART 9: SAMPLE DATA FOR ADMIN DASHBOARD TEST
-- ============================================================================

-- Get sample data for a specific school (automatically uses first school)
WITH school_data AS (
  SELECT id, name FROM schools LIMIT 1
)
SELECT 
  'SCHOOL' as data_type,
  (SELECT name FROM school_data) as value,
  'Sample school' as note
UNION ALL
SELECT 
  'STUDENTS',
  COUNT(*) || ' total',
  'Students in database'
FROM students
WHERE school_id = (SELECT id FROM schools LIMIT 1)
UNION ALL
SELECT 
  'CLASSES',
  COUNT(*) || ' total',
  'Classes for school'
FROM class_arm_combos
WHERE school_id = (SELECT id FROM schools LIMIT 1)
UNION ALL
SELECT 
  'TRANSACTIONS',
  COUNT(*) || ' total (₦' || ROUND(SUM(COALESCE(amount, 0))::NUMERIC, 2) || ')',
  'All transactions'
FROM transactions
WHERE school_id = (SELECT id FROM schools LIMIT 1);

-- ============================================================================
-- DIAGNOSTICS QUERIES
-- ============================================================================

-- If admin dashboard shows empty, run this to see what's being queried
-- This simulates what the API does (automatically uses first school)
SELECT 
  cac.id as class_id,
  c.name as class_name,
  a.name as arm_name,
  COUNT(s.id) as student_count
FROM class_arm_combos cac
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN students s ON s.class_arm_combo_id = cac.id
WHERE cac.school_id = (SELECT id FROM schools LIMIT 1)
GROUP BY cac.id, c.name, a.name
ORDER BY c.name, a.name
LIMIT 20;

-- If students aren't showing, check this
-- First get a sample class_arm_combo_id:
-- SELECT id FROM class_arm_combos LIMIT 1;
-- Then replace the UUID below with that actual ID
SELECT 
  s.id,
  s.admission_number,
  s.user_id,
  u.full_name,
  u.email,
  s.class_arm_combo_id,
  c.name as class_name,
  a.name as arm_name
FROM students s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN class_arm_combos cac ON s.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
WHERE s.school_id = (SELECT id FROM schools LIMIT 1)
ORDER BY s.admission_number
LIMIT 20;
