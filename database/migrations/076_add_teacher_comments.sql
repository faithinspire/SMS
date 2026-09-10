-- ============================================================================
-- Migration 076: Teacher Comments on Student Results
-- Allows teachers to add comments/remarks for each student per term
-- ============================================================================

-- Table: Teacher Comments on Student Results
CREATE TABLE IF NOT EXISTS teacher_result_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  
  -- Comment data
  comment_text TEXT,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one comment per student per term (can be updated)
  UNIQUE(school_id, student_id, term_id)
);

-- Indexes for performance
CREATE INDEX idx_teacher_comments_student 
  ON teacher_result_comments(student_id, term_id);

CREATE INDEX idx_teacher_comments_school_term 
  ON teacher_result_comments(school_id, term_id);

CREATE INDEX idx_teacher_comments_teacher 
  ON teacher_result_comments(teacher_id);

-- Trigger: Update timestamp on comment changes
CREATE OR REPLACE FUNCTION update_teacher_comments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_comments_update_timestamp
BEFORE UPDATE ON teacher_result_comments
FOR EACH ROW
EXECUTE FUNCTION update_teacher_comments_timestamp();

-- Verify migration
SELECT 'Migration 076: Teacher Comments System - APPLIED SUCCESSFULLY' as status;
