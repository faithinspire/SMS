-- Migration 033: Staff Password Management System
-- Allows school admins to manage staff passwords and automatic reset on staff removal

-- Step 1: Add password management table
CREATE TABLE IF NOT EXISTS staff_password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_email TEXT,
  old_password_hash TEXT,
  temporary_password TEXT,
  password_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  force_change_on_next_login BOOLEAN DEFAULT FALSE,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_password_history_school_id ON staff_password_history(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_password_history_staff_id ON staff_password_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_password_history_changed_at ON staff_password_history(password_changed_at DESC);

-- Step 3: Add position details table (for position-based letters)
CREATE TABLE IF NOT EXISTS position_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  salary_grade INT,
  benefits TEXT[],
  reporting_manager_role VARCHAR(50),
  work_hours TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, role)
);

-- Step 4: Create indexes for position details
CREATE INDEX IF NOT EXISTS idx_position_details_school_role ON position_details(school_id, role);

-- Step 5: Extend schools table for code of conduct
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS code_of_conduct_url TEXT,
ADD COLUMN IF NOT EXISTS code_of_conduct_text TEXT,
ADD COLUMN IF NOT EXISTS school_motto TEXT,
ADD COLUMN IF NOT EXISTS school_vision TEXT,
ADD COLUMN IF NOT EXISTS school_mission TEXT;

-- Step 6: Insert default position details if not exists
INSERT INTO position_details (school_id, role, title, description, benefits, work_hours)
SELECT 
  id,
  'TEACHER',
  'Teacher',
  'Responsible for delivering quality education and maintaining lesson records',
  ARRAY['Health Insurance', 'Annual Leave: 21 days', 'Professional Development', 'Lunch Allowance'],
  '8:00 AM - 4:00 PM'
FROM schools
WHERE NOT EXISTS (SELECT 1 FROM position_details WHERE school_id = schools.id AND role = 'TEACHER')
ON CONFLICT DO NOTHING;

INSERT INTO position_details (school_id, role, title, description, benefits, work_hours)
SELECT 
  id,
  'HEAD_TEACHER',
  'Head Teacher',
  'Oversee departmental activities and support the principal in academic management',
  ARRAY['Health Insurance', 'Annual Leave: 21 days', 'Professional Development', 'Lunch Allowance', 'Responsibility Allowance'],
  '8:00 AM - 4:00 PM'
FROM schools
WHERE NOT EXISTS (SELECT 1 FROM position_details WHERE school_id = schools.id AND role = 'HEAD_TEACHER')
ON CONFLICT DO NOTHING;

INSERT INTO position_details (school_id, role, title, description, benefits, work_hours)
SELECT 
  id,
  'PRINCIPAL',
  'Principal/Head of School',
  'Lead the school administration and ensure academic excellence and discipline',
  ARRAY['Health Insurance', 'Annual Leave: 21 days', 'Professional Development', 'Lunch Allowance', 'Executive Allowance', 'Transport Allowance'],
  '7:30 AM - 4:30 PM'
FROM schools
WHERE NOT EXISTS (SELECT 1 FROM position_details WHERE school_id = schools.id AND role = 'PRINCIPAL')
ON CONFLICT DO NOTHING;

INSERT INTO position_details (school_id, role, title, description, benefits, work_hours)
SELECT 
  id,
  'ACCOUNTANT',
  'Accountant',
  'Manage school finances, billing, and financial records',
  ARRAY['Health Insurance', 'Annual Leave: 21 days', 'Professional Development', 'Lunch Allowance'],
  '8:00 AM - 4:00 PM'
FROM schools
WHERE NOT EXISTS (SELECT 1 FROM position_details WHERE school_id = schools.id AND role = 'ACCOUNTANT')
ON CONFLICT DO NOTHING;

INSERT INTO position_details (school_id, role, title, description, benefits, work_hours)
SELECT 
  id,
  'STAFF',
  'Support Staff',
  'Provide administrative and operational support to the school',
  ARRAY['Health Insurance', 'Annual Leave: 14 days', 'Lunch Allowance'],
  '8:00 AM - 4:00 PM'
FROM schools
WHERE NOT EXISTS (SELECT 1 FROM position_details WHERE school_id = schools.id AND role = 'STAFF')
ON CONFLICT DO NOTHING;

-- Step 7: Create function to log staff deletion/password changes
CREATE OR REPLACE FUNCTION log_staff_password_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO staff_password_history (
      school_id, staff_id, reason, password_changed_at
    ) VALUES (
      NEW.school_id, NEW.id, 'Staff removed from system', NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for staff deletion
DROP TRIGGER IF NOT EXISTS trigger_log_staff_password_change ON users;
CREATE TRIGGER trigger_log_staff_password_change
  AFTER DELETE ON users
  FOR EACH ROW
  WHEN (OLD.role IN ('TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'))
  EXECUTE FUNCTION log_staff_password_change();

COMMIT;
