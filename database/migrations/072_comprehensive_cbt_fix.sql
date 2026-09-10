-- ============================================================================
-- Migration 072: Comprehensive CBT System Fix
-- Ensures all CBT tables have proper schema and constraints
-- ============================================================================

-- Step 1: Ensure academic_sessions exists
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

-- Step 2: Ensure academic_terms exists
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_name VARCHAR(50) NOT NULL,
  term_order INT NOT NULL DEFAULT 1,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_id, term_name)
);

-- Step 3: Verify cbt_exams table structure
-- Add missing columns
ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(20) CHECK (assessment_type IN ('CA1', 'CA2', 'CA3', 'CA4', 'MIDTERM', 'EXAM'));

ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'));

ALTER TABLE cbt_exams
ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL;

-- Step 4: Ensure cbt_options table has option_key column
ALTER TABLE cbt_options
ADD COLUMN IF NOT EXISTS option_key VARCHAR(10);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_current ON academic_sessions(is_current);

CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(is_active);

CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher_id ON cbt_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_academic_session_id ON cbt_exams(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_assessment_type ON cbt_exams(assessment_type);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_status ON cbt_exams(status);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_school_term ON cbt_exams(school_id, term_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher_subject_class ON cbt_exams(teacher_id, subject_id, class_arm_combo_id);

CREATE INDEX IF NOT EXISTS idx_cbt_questions_exam_id ON cbt_questions(cbt_exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_options_question_id ON cbt_options(question_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_exam_id ON cbt_submissions(cbt_exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_student_id ON cbt_submissions(student_id);

-- Step 6: Ensure data integrity
-- If any CBT has no teacher_id but has created_by, update it
UPDATE cbt_exams
SET teacher_id = created_by
WHERE teacher_id IS NULL AND created_by IS NOT NULL;

-- If any CBT has no academic_session_id but has term_id, try to fetch it
UPDATE cbt_exams ce
SET academic_session_id = at.session_id
FROM academic_terms at
WHERE ce.term_id = at.id
  AND ce.academic_session_id IS NULL;

COMMIT;
