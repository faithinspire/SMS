-- Migration 026: Create Teachers Table
-- This table stores teacher-specific information
-- Bulletproof version: removes invalid PostgreSQL syntax

-- Step 1: Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  salary DECIMAL(12, 2),
  teaching_level VARCHAR(50),
  qualification TEXT,
  experience_years INT,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, email),
  UNIQUE(school_id, user_id)
);

-- Step 2: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- Migration 026 completed successfully
