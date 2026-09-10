-- Migration 083: Create Lesson Notes System
-- Complete rewrite to fix foreign key issues

-- Drop existing tables if they exist (start fresh)
DROP TABLE IF EXISTS lesson_note_approvals CASCADE;
DROP TABLE IF EXISTS lesson_notes CASCADE;

-- Create lesson_notes table (NO foreign keys inline)
CREATE TABLE lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  teacher_name TEXT NOT NULL,
  subject_id UUID NOT NULL,
  class_arm_combo_id UUID NOT NULL,
  term_id UUID NOT NULL,
  lesson_date DATE NOT NULL,
  topic TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  content_summary TEXT,
  learning_objectives TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  reviewer_name TEXT,
  reviewer_feedback TEXT,
  approval_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lesson_note_approvals table (NO foreign keys inline)
CREATE TABLE lesson_note_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_note_id UUID NOT NULL,
  school_id UUID NOT NULL,
  reviewed_by UUID NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  feedback TEXT,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_lesson_notes_school_id ON lesson_notes(school_id);
CREATE INDEX idx_lesson_notes_teacher_id ON lesson_notes(teacher_id);
CREATE INDEX idx_lesson_notes_subject_id ON lesson_notes(subject_id);
CREATE INDEX idx_lesson_notes_class_arm_combo_id ON lesson_notes(class_arm_combo_id);
CREATE INDEX idx_lesson_notes_term_id ON lesson_notes(term_id);
CREATE INDEX idx_lesson_notes_lesson_date ON lesson_notes(lesson_date DESC);
CREATE INDEX idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX idx_lesson_notes_submitted_at ON lesson_notes(submitted_at DESC);
CREATE INDEX idx_lesson_notes_reviewed_at ON lesson_notes(reviewed_at DESC);

CREATE INDEX idx_lesson_note_approvals_lesson_note_id ON lesson_note_approvals(lesson_note_id);
CREATE INDEX idx_lesson_note_approvals_school_id ON lesson_note_approvals(school_id);
CREATE INDEX idx_lesson_note_approvals_reviewed_by ON lesson_note_approvals(reviewed_by);

-- Add comments for documentation
COMMENT ON TABLE lesson_notes IS 'Stores lesson notes uploaded by teachers for principal/head teacher review';
COMMENT ON TABLE lesson_note_approvals IS 'Audit trail of lesson note approvals and feedback from principals/head teachers';
