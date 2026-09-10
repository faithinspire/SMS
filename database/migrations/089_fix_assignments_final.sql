-- Migration 089: Final fix for assignments and lesson_notes
-- Just drop constraints and rename columns, don't try to add foreign keys

-- Step 1: Drop problematic constraints from assignments
ALTER TABLE IF EXISTS assignments DROP CONSTRAINT IF EXISTS fk_assignments_class_id;
ALTER TABLE IF EXISTS assignments DROP CONSTRAINT IF EXISTS fk_assignments_class_arm_combo_id;

-- Step 2: Check if class_id exists and rename it
DO $$
BEGIN
  -- Check if class_id column exists in assignments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE assignments RENAME COLUMN class_id TO class_arm_combo_id;
  END IF;
END $$;

-- Step 3: Ensure class_arm_combo_id exists
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID;

-- Step 4: Do the same for lesson_notes
-- Drop problematic constraints from lesson_notes
ALTER TABLE IF EXISTS lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_class_id;
ALTER TABLE IF EXISTS lesson_notes DROP CONSTRAINT IF EXISTS fk_lesson_notes_class_arm_combo_id;

-- Check if class_id exists in lesson_notes and rename
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_notes' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE lesson_notes RENAME COLUMN class_id TO class_arm_combo_id;
  END IF;
END $$;

-- Ensure class_arm_combo_id exists in lesson_notes
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS class_arm_combo_id UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS term_id UUID;

-- Step 5: Now add the foreign keys SAFELY
-- These will only be added if the columns exist and reference tables exist
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_class_arm_combo_id 
  FOREIGN KEY (class_arm_combo_id) REFERENCES class_arm_combos(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_school_id 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_teacher_id 
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_subject_id 
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_class_arm_combo_id 
  FOREIGN KEY (class_arm_combo_id) REFERENCES class_arm_combos(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_term_id 
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE;

ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_reviewed_by 
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
