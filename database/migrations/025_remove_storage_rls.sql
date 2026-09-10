-- Migration 025: Ensure Storage buckets exist for uploads
-- Note: Photo uploads use backend API endpoints with service role key
-- This bypasses any RLS policies automatically

-- Ensure student-documents bucket exists
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  true,
  false,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE 'Storage bucket verified: student-documents';

-- Note for developers:
-- Photo uploads work through these backend endpoints:
-- POST /api/upload/teacher-photo - Teacher photo upload
-- POST /api/upload/student-photo - Student photo upload
--
-- These endpoints:
-- 1. Accept FormData with file + metadata
-- 2. Use SUPABASE_SERVICE_ROLE_KEY (backend only)
-- 3. Bypass RLS completely (service role always succeeds)
-- 4. Return public URL in response
-- 5. Save URL to database automatically
--
-- Frontend calls: TeacherPhotoService.uploadTeacherPhoto() or StudentPhotoService.uploadStudentPhoto()
-- Which makes HTTP request to the backend API
-- Which uses service role key to upload

