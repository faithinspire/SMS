-- Migration 082: Create Student Assignments System
-- Allows students to upload assignments and teachers to view/grade them

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_arm_combo_id UUID NOT NULL,
  term_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_score NUMERIC(5,2) DEFAULT 10,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_assignment_submissions table
CREATE TABLE IF NOT EXISTS student_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  school_id UUID NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  submission_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submission_status TEXT DEFAULT 'SUBMITTED',
  teacher_score NUMERIC(5,2),
  teacher_feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  late BOOLEAN DEFAULT FALSE,
  is_late_submission BOOLEAN DEFAULT FALSE,
  days_late INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys for assignments
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_school_id FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_teacher_id FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_subject_id FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_class_arm_combo_id FOREIGN KEY (class_arm_combo_id) REFERENCES class_arm_combos(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_term_id FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE;

-- Add foreign keys for submissions
ALTER TABLE student_assignment_submissions ADD CONSTRAINT fk_submissions_assignment_id FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;
ALTER TABLE student_assignment_submissions ADD CONSTRAINT fk_submissions_student_id FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE student_assignment_submissions ADD CONSTRAINT fk_submissions_school_id FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE student_assignment_submissions ADD CONSTRAINT fk_submissions_graded_by FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_arm_combo_id ON assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_assignments_term_id ON assignments(term_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON student_assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON student_assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_school_id ON student_assignment_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON student_assignment_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON student_assignment_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_graded ON student_assignment_submissions(graded_at DESC);

-- Unique constraint: one submission per student per assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_assignment ON student_assignment_submissions(assignment_id, student_id);
