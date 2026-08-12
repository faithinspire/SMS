-- Add result sharing table for WhatsApp and Email sharing
CREATE TABLE result_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_to TEXT NOT NULL, -- Phone number or email
  shared_via VARCHAR(20) NOT NULL CHECK (shared_via IN ('WHATSAPP', 'EMAIL')),
  result_snapshot JSONB, -- Snapshot of the results shared
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_result_shares_student_id ON result_shares(student_id);
CREATE INDEX idx_result_shares_shared_by ON result_shares(shared_by);
CREATE INDEX idx_result_shares_shared_at ON result_shares(shared_at);
CREATE INDEX idx_result_shares_school_id ON result_shares(school_id);

-- Add sharing history
COMMENT ON TABLE result_shares IS 'Tracks all result shares to parents via WhatsApp and Email';
COMMENT ON COLUMN result_shares.result_snapshot IS 'JSON snapshot of the result data at time of sharing for audit trail';
