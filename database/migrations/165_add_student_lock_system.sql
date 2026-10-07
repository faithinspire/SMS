-- Migration 165: Add student lock system for school admin control
-- Allows school admins to lock/unlock student access server-side

BEGIN;

-- Add is_locked column to students table if it doesn't exist
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS locked_by_user_id UUID NULL DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS lock_reason TEXT NULL DEFAULT NULL;

-- Create index for fast locked student queries
CREATE INDEX IF NOT EXISTS idx_students_is_locked ON students(school_id, is_locked);
CREATE INDEX IF NOT EXISTS idx_students_locked_at ON students(locked_at) WHERE is_locked = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN students.is_locked IS 'TRUE if student access is locked by school admin';
COMMENT ON COLUMN students.locked_at IS 'Timestamp when student was locked';
COMMENT ON COLUMN students.locked_by_user_id IS 'User ID of admin who locked the student';
COMMENT ON COLUMN students.lock_reason IS 'Optional reason for lock (e.g., "Parent request", "Fees unpaid", "Behavioral issue")';

COMMIT;
