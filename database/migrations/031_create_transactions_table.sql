-- Create transactions table for accountant payments
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
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_transactions_school_id ON transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_id ON transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_school_type ON transactions(school_id, type);

-- Enable RLS (Row Level Security)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow all access (you have RLS disabled globally, but keeping this for future)
CREATE POLICY "Allow all access to transactions" ON transactions
  FOR ALL USING (true);

-- Add table comment
COMMENT ON TABLE transactions IS 'Stores all payment transactions from accountant dashboard';
COMMENT ON COLUMN transactions.type IS 'Either STAFF_SALARY or STUDENT_PAYMENT';
COMMENT ON COLUMN transactions.status IS 'Payment status: COMPLETED, PENDING, or FAILED';
