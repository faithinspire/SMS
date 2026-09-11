-- Migration: Add Staff Payment/Salary Fields
-- Purpose: Support staff profile management with payment details
-- Adds payment information fields to users table for staff members

BEGIN;

-- Add payment-related columns to users table
-- These fields are optional and mainly for staff management

ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(12,2);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_employment_date ON users(employment_date);
CREATE INDEX IF NOT EXISTS idx_users_bank_name ON users(bank_name);

-- Add comment to document these fields
COMMENT ON COLUMN users.employment_date IS 'Employment date for staff members';
COMMENT ON COLUMN users.bank_name IS 'Bank name for salary payment';
COMMENT ON COLUMN users.account_number IS 'Bank account number for salary payment';
COMMENT ON COLUMN users.account_holder_name IS 'Name on the bank account';
COMMENT ON COLUMN users.salary_amount IS 'Monthly salary amount in currency';

COMMIT;
