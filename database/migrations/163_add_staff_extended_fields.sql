-- Migration 163: Add Extended Staff and Student Fields
-- Adds missing columns referenced by letter generation, profile editing, and data management

-- Add extended fields to staff table
ALTER TABLE staff 
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS salary DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS salary_frequency VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- Add missing fields to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS department TEXT;
