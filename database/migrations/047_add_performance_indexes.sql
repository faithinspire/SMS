-- ============================================================================
-- MIGRATION 047: ADD PERFORMANCE INDEXES FOR CBT EXAM QUERIES
-- ============================================================================
-- Fixes timeout issues on CBT exam pages by adding missing indexes
-- and optimizing query performance for student lookups

-- ============================================================================
-- 1. ADD EXPLICIT INDEX ON students.user_id
-- ============================================================================
-- The students table has user_id as UNIQUE, but we add an explicit index
-- to ensure optimal query planning for lookups by user_id
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- ============================================================================
-- 2. ADD COMPOSITE INDEXES FOR COMMON CBT QUERIES
-- ============================================================================
-- Students table: school_id + user_id (common student lookup pattern)
CREATE INDEX IF NOT EXISTS idx_students_school_user_id ON students(school_id, user_id);

-- CBT submissions: school_id + student_id (query exam results by school and student)
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_school_student ON cbt_submissions(school_id, student_id);

-- CBT exams: school_id + subject_id (list exams by school and subject)
CREATE INDEX IF NOT EXISTS idx_cbt_exams_school_subject ON cbt_exams(school_id, subject_id);

-- CBT questions: cbt_exam_id with ordering (load exam questions)
CREATE INDEX IF NOT EXISTS idx_cbt_questions_exam_id ON cbt_questions(cbt_exam_id, display_order);

-- ============================================================================
-- 3. ADD INDEXES ON FOREIGN KEY JOINS
-- ============================================================================
-- Users table: needed for JOINs from students table
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Class arm combos: optimize JOINs for student class information
CREATE INDEX IF NOT EXISTS idx_class_arm_combos_id ON class_arm_combos(id);

-- Classes: optimize JOINs for class name lookup
CREATE INDEX IF NOT EXISTS idx_classes_id ON classes(id);

-- Arms: optimize JOINs for arm name lookup
CREATE INDEX IF NOT EXISTS idx_arms_id ON arms(id);

-- Subjects: optimize JOINs for subject name lookup
CREATE INDEX IF NOT EXISTS idx_subjects_id ON subjects(id);

-- Terms: optimize JOINs for term information
CREATE INDEX IF NOT EXISTS idx_terms_id ON terms(id);

-- ============================================================================
-- 4. ANALYZE UPDATED INDEXES FOR QUERY PLANNING
-- ============================================================================
-- This command tells PostgreSQL to update its statistics about these indexes
-- so the query planner can make optimal decisions
ANALYZE students;
ANALYZE cbt_submissions;
ANALYZE cbt_exams;
ANALYZE cbt_questions;
ANALYZE users;
ANALYZE class_arm_combos;
ANALYZE classes;
ANALYZE arms;
ANALYZE subjects;
ANALYZE terms;

-- ============================================================================
-- 5. MIGRATION NOTES
-- ============================================================================
-- This migration addresses CBT exam timeout issues by:
-- 1. Adding explicit indexes on frequently queried columns
-- 2. Creating composite indexes for common multi-column queries
-- 3. Ensuring PRIMARY KEY indexes exist on join targets
-- 4. Running ANALYZE to update query planner statistics
--
-- Common queries optimized:
-- - Finding student by user_id: uses idx_students_user_id
-- - Getting student in specific school: uses idx_students_school_user_id
-- - Loading CBT exam data: uses idx_cbt_exams_school_subject
-- - Loading exam questions: uses idx_cbt_questions_exam_id
-- - Getting submission results: uses idx_cbt_submissions_school_student
-- - JOINs for student details: uses pk indexes on users, classes, arms, subjects, terms
-- ============================================================================
