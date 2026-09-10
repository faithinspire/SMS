-- ============================================================================
-- MASTER MIGRATION SCRIPT - EXECUTE IN SUPABASE SQL EDITOR
-- ============================================================================
-- This script applies all critical fixes for the SMS system
-- Copy entire content and execute in: https://app.supabase.com → SQL Editor
-- ============================================================================

-- ============================================================================
-- MIGRATION 049: Add Academic Session Tracking to Score Sheets
-- ============================================================================

-- Create academic_sessions table
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_string TEXT NOT NULL, -- Format: "2026/2027"
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, session_string)
);

-- Create index for queries
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_current 
  ON academic_sessions(school_id, is_current);

-- Add columns to score_sheets
ALTER TABLE score_sheets 
ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL;

ALTER TABLE score_sheets 
ADD COLUMN IF NOT EXISTS session_year TEXT;

CREATE INDEX IF NOT EXISTS idx_score_sheets_academic_session 
  ON score_sheets(academic_session_id);

-- Populate default sessions for all schools
INSERT INTO academic_sessions (school_id, session_string, start_year, end_year, is_current)
SELECT 
  s.id,
  '2026/2027',
  2026,
  2027,
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM academic_sessions 
  WHERE school_id = s.id 
  AND session_string = '2026/2027'
) ON CONFLICT DO NOTHING;

SELECT 'Migration 049: Academic Sessions - COMPLETE ✅' AS status;

-- ============================================================================
-- MIGRATION 050: Expand Subjects Schema
-- ============================================================================

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT 'GENERAL';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS level INT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_type VARCHAR(50) DEFAULT 'CORE';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_subjects_school_active 
  ON subjects(school_id, is_active);

CREATE INDEX IF NOT EXISTS idx_subjects_school_level 
  ON subjects(school_id, level);

CREATE INDEX IF NOT EXISTS idx_subjects_school_section 
  ON subjects(school_id, section);

CREATE INDEX IF NOT EXISTS idx_subjects_school_department 
  ON subjects(school_id, department);

SELECT 'Migration 050: Subjects Schema - COMPLETE ✅' AS status;

-- ============================================================================
-- MIGRATION 051: Expand Students Schema
-- ============================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS section VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_registered TIMESTAMP DEFAULT NOW();
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_students_school_class_active 
  ON students(school_id, class_arm_combo_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_students_school_section 
  ON students(school_id, section);

SELECT 'Migration 051: Students Schema - COMPLETE ✅' AS status;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '=== VERIFICATION RESULTS ===' AS step;

-- Check academic_sessions
SELECT COUNT(*) as academic_sessions_count FROM academic_sessions;

-- Check score_sheets new columns
SELECT 
  'score_sheets' as table_name,
  COUNT(*) as row_count
FROM score_sheets;

-- Check subjects with new metadata
SELECT 
  COUNT(*) as total_subjects,
  COUNT(DISTINCT level) as levels,
  COUNT(DISTINCT section) as sections,
  COUNT(DISTINCT department) as departments
FROM subjects;

-- Check students with new fields
SELECT 
  COUNT(*) as total_students,
  COUNT(gender) as with_gender,
  COUNT(status) as with_status
FROM students;

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

SELECT 
  '✅ ALL MIGRATIONS APPLIED SUCCESSFULLY' AS status,
  NOW() AS completed_at;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Refresh browser: http://localhost:3000
-- 2. Test CBT system - submit an exam
-- 3. Check Supabase score_sheets table - should have academic_session_id
-- 4. Verify teacher-student linking works
-- 5. Check subjects appear in teacher assignment
-- ============================================================================
