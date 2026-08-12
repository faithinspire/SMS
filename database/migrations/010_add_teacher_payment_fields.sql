-- Add payment and employment details to teachers table
-- Teachers can track salary, bank account, and employment status

ALTER TABLE users
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS employment_date DATE;

-- Add index for payment tracking
CREATE INDEX IF NOT EXISTS idx_users_salary ON users(school_id, salary_amount);
CREATE INDEX IF NOT EXISTS idx_users_employment_date ON users(school_id, employment_date);
