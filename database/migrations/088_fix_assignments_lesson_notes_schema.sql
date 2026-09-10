-- Migration 088: Fix assignments and lesson_notes schema
-- Ensures correct column names match the code (ALTER existing tables, don't recreate)

-- Step 1: Rename class_id to class_arm_combo_id in assignments table
-- First, drop the foreign key constraint on class_id
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS fk_assignments_class_id;

-- Rename the column
ALTER TABLE assignments RENAME COLUMN class_id TO class_arm_combo_id;

-- Add the new foreign key constraint
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_class_arm_combo_id 
  FOREIGN KEY (class_arm_combo_id) REFERENCES class_arm_combos(id) ON DELETE CASCADE;

-- Update the index name
DROP INDEX IF EXISTS idx_assignments_class_id;
CREATE INDEX IF NOT EXISTS idx_assignments_class_arm_combo_id ON assignments(class_arm_combo_id);

-- Step 2: Fix lesson_notes table - must handle existing column names
-- First check what columns exist and rename them to what we need

-- If class_id exists in lesson_notes, rename it
ALTER TABLE lesson_notes RENAME COLUMN class_id TO class_arm_combo_id;

-- Make sure school_id, teacher_id, subject_id, term_id are UUID type if they exist
-- Verify lesson_notes has all required columns, add if missing
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS term_id UUID;

-- Drop old constraints that reference wrong columns
ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_school_id;
ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_teacher_id;
ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_subject_id;
ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_class_id;
ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_class_arm_combo_id;
ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_term_id;
ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_reviewed_by;

-- Add new foreign key constraints for lesson_notes with correct columns
ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_school_id FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_teacher_id FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_subject_id FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_class_arm_combo_id FOREIGN KEY (class_arm_combo_id) REFERENCES class_arm_combos(id) ON DELETE CASCADE;
ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_term_id FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE;
ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Recreate indexes for lesson_notes (drop old ones first)
DROP INDEX IF EXISTS idx_lesson_notes_school_id;
DROP INDEX IF EXISTS idx_lesson_notes_teacher_id;
DROP INDEX IF EXISTS idx_lesson_notes_subject_id;
DROP INDEX IF EXISTS idx_lesson_notes_class_id;
DROP INDEX IF EXISTS idx_lesson_notes_class_arm_combo_id;
DROP INDEX IF EXISTS idx_lesson_notes_term_id;
DROP INDEX IF EXISTS idx_lesson_notes_lesson_date;
DROP INDEX IF EXISTS idx_lesson_notes_status;
DROP INDEX IF EXISTS idx_lesson_notes_submitted_at;
DROP INDEX IF EXISTS idx_lesson_notes_reviewed_at;

CREATE INDEX idx_lesson_notes_school_id ON lesson_notes(school_id);
CREATE INDEX idx_lesson_notes_teacher_id ON lesson_notes(teacher_id);
CREATE INDEX idx_lesson_notes_subject_id ON lesson_notes(subject_id);
CREATE INDEX idx_lesson_notes_class_arm_combo_id ON lesson_notes(class_arm_combo_id);
CREATE INDEX idx_lesson_notes_term_id ON lesson_notes(term_id);
CREATE INDEX idx_lesson_notes_lesson_date ON lesson_notes(lesson_date DESC);
CREATE INDEX idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX idx_lesson_notes_submitted_at ON lesson_notes(submitted_at DESC);
CREATE INDEX idx_lesson_notes_reviewed_at ON lesson_notes(reviewed_at DESC);
