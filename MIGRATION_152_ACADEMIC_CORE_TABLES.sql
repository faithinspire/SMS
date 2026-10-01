-- Migration 152: Add Academic Core Tables
-- EXECUTE THIS IN SUPABASE FIRST
-- Creates: academic_sessions, academic_terms
-- Fixes: Results page "No sessions found" error

DROP TABLE IF EXISTS public.academic_terms CASCADE;
DROP TABLE IF EXISTS public.academic_sessions CASCADE;

-- Create academic_sessions table
CREATE TABLE public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name),
    CHECK (end_year > start_year)
);

-- Create academic_terms table
CREATE TABLE public.academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    term_number INTEGER CHECK (term_number >= 1 AND term_number <= 3),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, term_number),
    CHECK (end_date > start_date)
);

-- Create indexes for performance
CREATE INDEX idx_academic_sessions_school_id ON academic_sessions(school_id);
CREATE INDEX idx_academic_sessions_school_active ON academic_sessions(school_id, is_active);
CREATE INDEX idx_academic_terms_school_id ON academic_terms(school_id);
CREATE INDEX idx_academic_terms_session_id ON academic_terms(session_id);
CREATE INDEX idx_academic_terms_school_active ON academic_terms(school_id, is_active);

-- Disable RLS for performance
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms DISABLE ROW LEVEL SECURITY;

-- Insert default session for current year
INSERT INTO academic_sessions (school_id, name, start_year, end_year, is_active)
SELECT 
    id,
    '2024/2025',
    2024,
    2025,
    TRUE
FROM schools
WHERE id NOT IN (
    SELECT DISTINCT school_id FROM academic_sessions 
    WHERE name = '2024/2025'
);

-- Insert default terms for each session
INSERT INTO academic_terms (school_id, session_id, name, term_number, start_date, end_date, is_active)
SELECT 
    s.school_id,
    s.id,
    CASE 
        WHEN t.term_number = 1 THEN 'First Term'
        WHEN t.term_number = 2 THEN 'Second Term'
        WHEN t.term_number = 3 THEN 'Third Term'
    END,
    t.term_number,
    CASE 
        WHEN t.term_number = 1 THEN '2024-09-01'::DATE
        WHEN t.term_number = 2 THEN '2024-12-01'::DATE
        WHEN t.term_number = 3 THEN '2025-03-01'::DATE
    END,
    CASE 
        WHEN t.term_number = 1 THEN '2024-11-30'::DATE
        WHEN t.term_number = 2 THEN '2025-02-28'::DATE
        WHEN t.term_number = 3 THEN '2025-05-30'::DATE
    END,
    TRUE
FROM academic_sessions s
CROSS JOIN (
    SELECT 1 as term_number
    UNION ALL SELECT 2
    UNION ALL SELECT 3
) t
WHERE NOT EXISTS (
    SELECT 1 FROM academic_terms 
    WHERE session_id = s.id AND term_number = t.term_number
);

-- Verify
SELECT 'academic_sessions' as table_name, COUNT(*) as record_count FROM academic_sessions
UNION ALL
SELECT 'academic_terms', COUNT(*) FROM academic_terms;
