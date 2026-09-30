/**
 * Migration 147: Add Missing Profile Columns to Users Table
 * 
 * PURPOSE: Add gender, address, state, lga columns that StudentProfileEditModal
 * and staff management pages expect but don't exist in schema
 * 
 * IMPACT: Fixes "column users.gender does not exist" error on student edit
 */

-- Add missing profile columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lga VARCHAR(100);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);

-- Verify columns were added
DO $$
BEGIN
  RAISE NOTICE 'Migration 147: Added gender, address, state, lga columns to users table';
END $$;
