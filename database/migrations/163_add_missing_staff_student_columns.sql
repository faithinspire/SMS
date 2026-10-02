-- ✅ HOTFIX 2026-10-02: Critical schema fixes for production
-- Migration 163: Add missing columns to staff and students tables
-- Fixes 400 Bad Request errors when querying for department and status columns
-- 
-- ISSUES FIXED:
-- ✅ "column students.status does not exist" (400 Bad Request)
-- ✅ "column staff.department does not exist" (400 Bad Request)
-- ✅ Error generating staff letter (missing column in query)
-- ✅ Error generating student letter (missing column in query)

-- Add status column to students table if it doesn't exist
ALTER TABLE students
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED'));

-- Add department column to staff table if it doesn't exist
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add comment for documentation
COMMENT ON COLUMN students.status IS 'Student status: ACTIVE, INACTIVE, TRANSFERRED, GRADUATED';
COMMENT ON COLUMN staff.department IS 'Department or unit where staff member works';
