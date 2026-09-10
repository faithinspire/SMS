-- Migration 097: Safe Storage Buckets Creation
-- Creates buckets WITHOUT touching RLS or storage.objects permissions
-- Safe and non-destructive

BEGIN;

-- Create buckets using simple INSERT
-- These should succeed even without storage table ownership
INSERT INTO storage.buckets (id, name, owner, public, created_at, updated_at)
VALUES 
  ('lesson-uploads', 'lesson-uploads', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, owner, public, created_at, updated_at)
VALUES 
  ('assignment-files', 'assignment-files', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, owner, public, created_at, updated_at)
VALUES 
  ('student-assignments', 'student-assignments', NULL, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- Summary: Buckets created safely without RLS modifications
-- ============================================================================
