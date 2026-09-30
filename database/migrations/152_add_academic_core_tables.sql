-- Migration 152: Add core academic tables (academic_sessions, academic_terms)
-- These are critical for the results page to function

-- Create academic_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, session_year)
);

-- Create academic_terms table if it doesn't exist
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_name TEXT NOT NULL,
  term_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, session_id, term_order)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(is_active);

-- Disable RLS for admin access
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms DISABLE ROW LEVEL SECURITY;

-- Ensure existing data is not duplicated - only insert if tables were empty
INSERT INTO academic_sessions (school_id, session_year, is_active)
SELECT id, '2024/2025', true FROM schools
WHERE id NOT IN (SELECT DISTINCT school_id FROM academic_sessions)
ON CONFLICT (school_id, session_year) DO NOTHING;

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
SELECT 
  s.id,
  (SELECT id FROM academic_sessions WHERE school_id = s.id ORDER BY created_at DESC LIMIT 1),
  'Term 1',
  1,
  true
FROM schools s
WHERE s.id NOT IN (SELECT DISTINCT school_id FROM academic_terms WHERE term_order = 1)
ON CONFLICT (school_id, session_id, term_order) DO NOTHING;

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
SELECT 
  s.id,
  (SELECT id FROM academic_sessions WHERE school_id = s.id ORDER BY created_at DESC LIMIT 1),
  'Term 2',
  2,
  false
FROM schools s
WHERE s.id NOT IN (SELECT DISTINCT school_id FROM academic_terms WHERE term_order = 2)
ON CONFLICT (school_id, session_id, term_order) DO NOTHING;

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active)
SELECT 
  s.id,
  (SELECT id FROM academic_sessions WHERE school_id = s.id ORDER BY created_at DESC LIMIT 1),
  'Term 3',
  3,
  false
FROM schools s
WHERE s.id NOT IN (SELECT DISTINCT school_id FROM academic_terms WHERE term_order = 3)
ON CONFLICT (school_id, session_id, term_order) DO NOTHING;
