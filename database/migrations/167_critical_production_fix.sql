-- ============================================================================
-- CRITICAL PRODUCTION FIX: Migration 167
-- ============================================================================
-- This migration adds ALL missing columns blocking production
-- Run this in Supabase SQL Editor NOW
-- ============================================================================

-- Migration 163: Add missing staff and student columns
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS salary DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED'));

-- Migration 164: Add missing schools columns
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS school_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS principal_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS principal_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS established_year INTEGER;

-- Migration 165: Ensure all required teacher_class_assignments table exists and is properly structured
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher_id ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class_id ON teacher_class_assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_school_id ON teacher_class_assignments(school_id);

-- Verify columns were added
SELECT 'Migration 167 Complete - All critical columns added' as status;
