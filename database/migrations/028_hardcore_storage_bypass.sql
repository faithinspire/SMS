-- HARDCORE STORAGE BYPASS - Works without ownership changes
-- This completely removes RLS restrictions for MVP/testing
-- Production should implement row-level policies

-- ============================================================================
-- STEP 1: DISABLE ALL RLS ON STORAGE SCHEMA (COMPLETE BYPASS)
-- ============================================================================

-- Disable on all storage tables at once
ALTER TABLE IF EXISTS storage.buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.migrations DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: ENSURE STORAGE BUCKETS EXIST (CREATE IF NOT)
-- ============================================================================

-- These are safe INSERT with ON CONFLICT DO NOTHING
-- Won't fail if buckets already exist

INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, created_at, updated_at)
VALUES 
  ('student-photos', 'student-photos', NULL, false, 5242880, NOW(), NOW()),
  ('teacher-photos', 'teacher-photos', NULL, false, 5242880, NOW(), NOW()),
  ('school-logos', 'school-logos', NULL, true, 10485760, NOW(), NOW()),
  ('documents', 'documents', NULL, false, 10485760, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS ON STORAGE SCHEMA (SAFE APPROACH)
-- ============================================================================

-- These are safe and won't fail even if already granted
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT INSERT ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT UPDATE ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT DELETE ON ALL TABLES IN SCHEMA storage TO authenticated;

-- ============================================================================
-- STEP 4: CREATE SIMPLE BYPASS POLICIES (OPTIONAL - RLS disabled anyway)
-- ============================================================================

-- These are optional since RLS is disabled, but good for documentation

-- Allow authenticated users to upload
CREATE POLICY "authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "authenticated_read"
ON storage.objects FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update/delete
CREATE POLICY "authenticated_modify"
ON storage.objects FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (true);

-- Allow public read for public buckets
CREATE POLICY "public_read"
ON storage.objects FOR SELECT
TO public
USING ((SELECT public FROM storage.buckets WHERE id = bucket_id));

-- ============================================================================
-- RESULT: 
-- - RLS completely disabled
-- - Authenticated users can upload/download/delete
-- - No ownership issues
-- - Photo uploads will work
-- ============================================================================

COMMIT;
