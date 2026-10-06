---
--- Migration 164: Expand student status values to support PAUSED and SUSPENDED
--- Date: 2026-10-06
--- Purpose: Support student account pausing/locking by school admins
---

-- Drop the existing CHECK constraint and add a new one with extended values
ALTER TABLE students
DROP CONSTRAINT IF EXISTS "students_status_check";

ALTER TABLE students
ADD CONSTRAINT "students_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED', 'PAUSED', 'SUSPENDED'));

-- Update the column comment
COMMENT ON COLUMN students.status IS 'Student status: ACTIVE, INACTIVE, PAUSED, SUSPENDED, TRANSFERRED, GRADUATED';

-- Backfill existing null values to ACTIVE (important for existing schools)
UPDATE students SET status = 'ACTIVE' WHERE status IS NULL;

-- Ensure status is NOT NULL going forward
ALTER TABLE students
ALTER COLUMN status SET NOT NULL;
