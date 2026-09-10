-- Migration 017: Create Bridge Tables for Student-Teacher Relationships
-- These tables link students to their class teachers and subject teachers

-- ============================================================================
-- BRIDGE TABLES FOR STUDENT-TEACHER RELATIONSHIPS
-- ============================================================================

-- Links students to their class teachers (one class teacher per student per class)
CREATE TABLE IF NOT EXISTS student_class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, student_id, class_arm_combo_id)
);

-- Links students to their subject teachers (can have multiple per student, one per subject)
CREATE TABLE IF NOT EXISTS student_subject_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, student_id, subject_id, teacher_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_class_teachers_student_id ON student_class_teachers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_class_teachers_teacher_id ON student_class_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_class_teachers_class_arm_combo_id ON student_class_teachers(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_student_class_teachers_school_id ON student_class_teachers(school_id);

CREATE INDEX IF NOT EXISTS idx_student_subject_teachers_student_id ON student_subject_teachers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_teachers_teacher_id ON student_subject_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_teachers_subject_id ON student_subject_teachers(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_teachers_school_id ON student_subject_teachers(school_id);

-- Enable RLS on bridge tables
ALTER TABLE student_class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subject_teachers ENABLE ROW LEVEL SECURITY;
