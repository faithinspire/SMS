-- ============================================================================
-- Migration 160: NUKE ALL PROBLEMATIC FUNCTIONS AND TRIGGERS
-- ============================================================================
-- This migration removes EVERY function and trigger that might use ON CONFLICT
-- The API (seedSchoolCurriculum) will handle seeding safely with proper logic
-- ============================================================================

BEGIN TRANSACTION;

-- Drop EVERYTHING that might use ON CONFLICT
DROP TRIGGER IF EXISTS auto_initialize_school_curriculum ON schools CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_seed_school_old ON schools CASCADE;

DROP FUNCTION IF EXISTS trigger_auto_seed_school() CASCADE;
DROP FUNCTION IF EXISTS trigger_auto_seed_on_school_insert() CASCADE;
DROP FUNCTION IF EXISTS auto_seed_school_safe(UUID) CASCADE;
DROP FUNCTION IF EXISTS ensure_academic_session_exists(UUID) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_session(UUID, VARCHAR, INT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS safe_insert_academic_term(UUID, UUID, VARCHAR, INT, DATE, DATE, BOOLEAN) CASCADE;

-- Ensure academic_sessions table exists with safe columns
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20),
  start_year INT,
  end_year INT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure academic_terms table exists with safe columns
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_number INT,
  name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);

-- Disable RLS on these tables so seedSchoolCurriculum can write to them
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms DISABLE ROW LEVEL SECURITY;

-- DONE: No triggers, no functions, no ON CONFLICT anywhere
SELECT 'Migration 160: All problematic functions removed. School registration will use API-level seeding.' as status;

COMMIT;
