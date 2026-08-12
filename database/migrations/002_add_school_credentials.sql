-- Add admin credentials columns to schools table
-- This allows Super Admin to store school login credentials

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS admin_email TEXT,
ADD COLUMN IF NOT EXISTS admin_password TEXT;

-- Update schools table to include these columns in updated_at tracking
-- (Already has updated_at, just document the new columns)

-- Example: INSERT schools with credentials
-- INSERT INTO schools (name, admin_email, admin_password, status) 
-- VALUES ('Example School', 'admin@school.edu', 'encrypted_password', 'ACTIVE');
