-- Enhance payment tables for accountant dashboard
-- Migration: 019_enhance_payment_tables.sql
-- Purpose: Add necessary columns for payment and salary tracking

BEGIN;

-- Add columns to payments table if they don't exist
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'TUITION',
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE', 'CHEQUE')),
ADD COLUMN IF NOT EXISTS receipt_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create salaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_period VARCHAR(50), -- "JANUARY_2026", "FEBRUARY_2026", etc.
  payment_date DATE,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REJECTED')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payslips table if it doesn't exist
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  salary_id UUID NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gross_amount NUMERIC(12, 2) NOT NULL,
  deductions NUMERIC(12, 2) DEFAULT 0,
  net_amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to_staff_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create receipts table if it doesn't exist
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  student_name VARCHAR(255),
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  fee_type VARCHAR(50),
  payment_date DATE NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pdf_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_payments_student_school ON payments(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, school_id);
CREATE INDEX IF NOT EXISTS idx_salaries_staff_school ON salaries(staff_id, school_id);
CREATE INDEX IF NOT EXISTS idx_salaries_status ON salaries(status, school_id);
CREATE INDEX IF NOT EXISTS idx_payslips_staff_school ON payslips(staff_id, school_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_school ON receipts(payment_id, school_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts(student_id, school_id);

COMMIT;
