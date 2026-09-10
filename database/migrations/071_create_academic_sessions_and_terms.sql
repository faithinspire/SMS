-- ============================================================================
-- Migration 071: Create Academic Sessions and Terms Tables
-- Unified academic hierarchy for SMS
-- ============================================================================

-- Create academic_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_year VARCHAR(20) NOT NULL, -- e.g., "2025/2026"
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year)
);

-- Create academic_terms table if it doesn't exist
CREATE TABLE IF NOT EXISTS academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_name VARCHAR(50) NOT NULL, -- e.g., "First Term", "Second Term"
  term_order INT NOT NULL DEFAULT 1, -- 1 for first, 2 for second, 3 for third
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_id, term_name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_is_current ON academic_sessions(is_current);
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_is_active ON academic_terms(is_active);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_academic_terms_school_session ON academic_terms(school_id, session_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_school_current ON academic_sessions(school_id, is_current);

COMMIT;
