-- ============================================================================
-- PHASE 1: DATABASE MIGRATIONS FOR ENTERPRISE FEATURES
-- ============================================================================
-- This migration adds enterprise-level features:
-- 1. Status columns for schools, students, and staff
-- 2. File upload tracking system
-- 3. Deletion request workflow for sensitive data
-- ============================================================================

-- ============================================================================
-- 1. ALTER EXISTING TABLES - ADD STATUS & PHOTO COLUMNS
-- ============================================================================

-- Add status column to schools if not exists (may already exist)
ALTER TABLE schools 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'PAUSED', 'SUSPENDED'));

-- Add/Update photo_url for students
ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update users table - add photo_url if not exists
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Ensure users table has status column with proper values
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users 
  ADD CONSTRAINT users_status_check 
  CHECK (status IN ('ACTIVE', 'PAUSED', 'INACTIVE', 'SUSPENDED'));

-- Add status to staff if needed
ALTER TABLE staff 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'PAUSED', 'INACTIVE', 'SUSPENDED'));

-- ============================================================================
-- 2. CREATE NEW TABLES FOR ENTERPRISE FEATURES
-- ============================================================================

-- Deletion Requests Table
-- Allows teachers to request student deletion, tracked for audit
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'STUDENT_DELETION' 
    CHECK (request_type IN ('STUDENT_DELETION', 'TEACHER_DELETION', 'STAFF_DELETION')),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' 
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  metadata JSONB DEFAULT '{}'::JSONB,
  UNIQUE(student_id, status) -- Only one pending deletion per student
);

-- File Uploads Table
-- Tracks all file uploads to cloud storage with metadata
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL 
    CHECK (file_type IN ('SCHOOL_LOGO', 'STUDENT_PHOTO', 'STAFF_PHOTO', 'DOCUMENT', 'ASSIGNMENT', 'LESSON_MATERIAL')),
  file_size_bytes INT,
  file_extension VARCHAR(10),
  mime_type VARCHAR(100),
  storage_path TEXT NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'SUPABASE' CHECK (storage_provider IN ('SUPABASE', 'AWS_S3', 'GOOGLE_CLOUD')),
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Reference to entity this file belongs to
  related_entity_type VARCHAR(50) CHECK (related_entity_type IN ('SCHOOL', 'STUDENT', 'STAFF', 'ASSIGNMENT', 'LESSON')),
  related_entity_id UUID,
  
  -- Virus scan & security
  virus_scanned BOOLEAN DEFAULT FALSE,
  virus_scan_result VARCHAR(50),
  virus_scanned_at TIMESTAMP WITH TIME ZONE,
  
  -- Lifecycle
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  accessed_count INT DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CBT Results Sharing Table
-- Tracks which parents/guardians can view student CBT results
CREATE TABLE IF NOT EXISTS cbt_result_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  cbt_exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  shared_with_guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_method VARCHAR(50) NOT NULL 
    CHECK (share_method IN ('EMAIL', 'WHATSAPP', 'SMS', 'MANUAL')),
  access_expires_at TIMESTAMP WITH TIME ZONE,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Deletion Requests Indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_school_id 
  ON deletion_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_student_id 
  ON deletion_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status 
  ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_initiated_by 
  ON deletion_requests(initiated_by);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_created_at 
  ON deletion_requests(created_at);

-- File Uploads Indexes
CREATE INDEX IF NOT EXISTS idx_file_uploads_school_id 
  ON file_uploads(school_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id 
  ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_file_type 
  ON file_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_related_entity 
  ON file_uploads(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at 
  ON file_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_file_uploads_is_deleted 
  ON file_uploads(is_deleted);

-- CBT Result Sharing Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_result_sharing_school_id 
  ON cbt_result_sharing(school_id);
CREATE INDEX IF NOT EXISTS idx_cbt_result_sharing_student_id 
  ON cbt_result_sharing(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_result_sharing_exam_id 
  ON cbt_result_sharing(cbt_exam_id);

-- ============================================================================
-- 4. UPDATE EXISTING INDEXES
-- ============================================================================

-- Schools status index
CREATE INDEX IF NOT EXISTS idx_schools_status 
  ON schools(status);

-- Users status index
CREATE INDEX IF NOT EXISTS idx_users_status 
  ON users(status);

-- Staff status index
CREATE INDEX IF NOT EXISTS idx_staff_status 
  ON staff(status);

-- ============================================================================
-- 5. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_result_sharing ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to soft-delete a file
CREATE OR REPLACE FUNCTION soft_delete_file(file_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE file_uploads 
  SET is_deleted = TRUE, deleted_at = NOW()
  WHERE id = file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve deletion request
CREATE OR REPLACE FUNCTION approve_deletion_request(
  request_id UUID,
  approved_by_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE deletion_requests 
  SET 
    status = 'APPROVED',
    approved_by = approved_by_user_id,
    approved_at = NOW()
  WHERE id = request_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject deletion request
CREATE OR REPLACE FUNCTION reject_deletion_request(
  request_id UUID,
  rejected_by_user_id UUID,
  rejection_reason_text TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE deletion_requests 
  SET 
    status = 'REJECTED',
    rejected_by = rejected_by_user_id,
    rejection_reason = rejection_reason_text,
    rejected_at = NOW()
  WHERE id = request_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete deletion request (actually delete the student)
CREATE OR REPLACE FUNCTION complete_deletion_request(
  request_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_student_id UUID;
  v_user_id UUID;
BEGIN
  -- Get student ID from request
  SELECT student_id, (SELECT user_id FROM students WHERE id = student_id)
  INTO v_student_id, v_user_id
  FROM deletion_requests
  WHERE id = request_id;
  
  -- Delete student record (cascades to related data)
  DELETE FROM students WHERE id = v_student_id;
  
  -- Delete user record
  DELETE FROM users WHERE id = v_user_id;
  
  -- Update deletion request status
  UPDATE deletion_requests 
  SET 
    status = 'COMPLETED',
    completed_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file upload stats
CREATE OR REPLACE FUNCTION get_file_upload_stats(school_id_param UUID)
RETURNS TABLE (
  total_files BIGINT,
  total_size_mb NUMERIC,
  files_by_type JSONB,
  last_upload_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    ROUND(SUM(file_size_bytes)::NUMERIC / 1024 / 1024, 2),
    jsonb_object_agg(file_type, COUNT(*)),
    MAX(created_at)
  FROM file_uploads
  WHERE school_id = school_id_param AND is_deleted = FALSE
  GROUP BY school_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for pending deletion requests needing approval
CREATE OR REPLACE VIEW pending_deletion_requests AS
SELECT 
  dr.id,
  dr.school_id,
  dr.student_id,
  u.full_name as student_name,
  dr.initiated_by,
  initiate_user.full_name as requested_by,
  dr.reason,
  dr.status,
  dr.created_at,
  dr.expires_at
FROM deletion_requests dr
JOIN students s ON dr.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN users initiate_user ON dr.initiated_by = initiate_user.id
WHERE dr.status = 'PENDING'
ORDER BY dr.created_at DESC;

-- View for file upload activity
CREATE OR REPLACE VIEW file_upload_activity AS
SELECT 
  fu.id,
  fu.school_id,
  fu.file_name,
  fu.file_type,
  fu.file_size_bytes,
  fu.created_at,
  u.full_name as uploaded_by,
  CASE 
    WHEN fu.related_entity_type = 'SCHOOL' THEN 'School: ' || s.name
    WHEN fu.related_entity_type = 'STUDENT' THEN 'Student: ' || usr.full_name
    ELSE fu.related_entity_type
  END as related_to
FROM file_uploads fu
LEFT JOIN users u ON fu.user_id = u.id
LEFT JOIN schools s ON fu.related_entity_type = 'SCHOOL' AND fu.related_entity_id = s.id
LEFT JOIN users usr ON fu.related_entity_type = 'STUDENT' AND fu.related_entity_id = (
  SELECT user_id FROM students WHERE id = fu.related_entity_id
)
WHERE fu.is_deleted = FALSE
ORDER BY fu.created_at DESC;

-- ============================================================================
-- 8. AUDIT LOGGING - ADD TRIGGERS
-- ============================================================================

-- Trigger to log deletion requests
CREATE OR REPLACE FUNCTION log_deletion_request_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    school_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    status,
    created_at
  ) VALUES (
    NEW.school_id,
    NEW.initiated_by,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'CREATE_DELETION_REQUEST'
      WHEN TG_OP = 'UPDATE' THEN 'UPDATE_DELETION_REQUEST'
      ELSE 'DELETE_DELETION_REQUEST'
    END,
    'DELETION_REQUEST',
    NEW.id,
    row_to_json(OLD),
    row_to_json(NEW),
    'SUCCESS',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_log_deletion_request
  AFTER INSERT OR UPDATE ON deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_deletion_request_change();

-- Trigger to log file uploads
CREATE OR REPLACE FUNCTION log_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    school_id,
    user_id,
    action,
    entity_type,
    entity_id,
    new_values,
    status,
    created_at
  ) VALUES (
    NEW.school_id,
    NEW.user_id,
    'FILE_UPLOAD',
    'FILE',
    NEW.id,
    jsonb_build_object(
      'file_name', NEW.file_name,
      'file_type', NEW.file_type,
      'file_size_bytes', NEW.file_size_bytes,
      'storage_path', NEW.storage_path
    ),
    'SUCCESS',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_log_file_upload
  AFTER INSERT ON file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION log_file_upload();

-- ============================================================================
-- 9. VERIFICATION QUERIES (run separately to verify migration worked)
-- ============================================================================

/*
-- Verify all tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('deletion_requests', 'file_uploads', 'cbt_result_sharing');

-- Verify columns added:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'schools' AND column_name = 'status';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'photo_url';
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
