-- Add phone column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add admission_number to users table for students
ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_number TEXT;

-- Ensure transactions table exists with all required columns
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('STAFF_SALARY', 'STUDENT_PAYMENT')),
  recipient_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  invoice_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_transactions_school_id ON transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_id ON transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_school_type ON transactions(school_id, type);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all access to transactions" ON transactions;
CREATE POLICY "Allow all access to transactions" ON transactions FOR ALL USING (true);

-- Add indexes for users if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
