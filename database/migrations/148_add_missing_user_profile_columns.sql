-- Migration 148: Add Missing User Profile Columns
-- Purpose: Add gender, address, state, lga, and phone columns to users table
-- These columns are expected by staff, student, and dashboard pages

BEGIN;

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lga VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add employment-related columns for staff
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_amount DECIMAL(12, 2);

-- Create index for frequently searched columns
CREATE INDEX IF NOT EXISTS idx_users_school_id_role ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

COMMIT;
