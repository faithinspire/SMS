-- Migration 149: Populate Test Academic Sessions and Terms
-- Purpose: Create sample academic sessions and terms for all schools
-- This enables the results page dropdowns to function
-- Uses term_order (not term_number) to match academic_terms schema from migration 111

BEGIN;

-- First, get all schools
WITH school_list AS (
  SELECT DISTINCT school_id FROM users WHERE school_id IS NOT NULL
)

-- Create academic sessions for each school (2024/2025, 2025/2026, 2026/2027)
INSERT INTO academic_sessions (school_id, session_year, is_active, created_at, updated_at)
SELECT 
  school_id,
  '2024/2025',
  FALSE,
  NOW(),
  NOW()
FROM school_list
ON CONFLICT (school_id, session_year) DO NOTHING;

INSERT INTO academic_sessions (school_id, session_year, is_active, created_at, updated_at)
SELECT 
  school_id,
  '2025/2026',
  TRUE,
  NOW(),
  NOW()
FROM school_list
ON CONFLICT (school_id, session_year) DO NOTHING;

INSERT INTO academic_sessions (school_id, session_year, is_active, created_at, updated_at)
SELECT 
  school_id,
  '2026/2027',
  FALSE,
  NOW(),
  NOW()
FROM school_list
ON CONFLICT (school_id, session_year) DO NOTHING;

-- Create academic terms for each session
-- For each session, create 3 terms with term_order and date ranges
WITH session_data AS (
  SELECT id, school_id FROM academic_sessions WHERE session_year = '2025/2026' AND is_active = TRUE
)

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active, start_date, end_date, created_at, updated_at)
SELECT 
  sd.school_id,
  sd.id,
  'First Term',
  1,
  TRUE,
  DATE '2025-09-01',
  DATE '2025-11-30',
  NOW(),
  NOW()
FROM session_data sd
ON CONFLICT (session_id, term_name) DO NOTHING;

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active, start_date, end_date, created_at, updated_at)
SELECT 
  sd.school_id,
  sd.id,
  'Second Term',
  2,
  FALSE,
  DATE '2025-12-01',
  DATE '2026-03-31',
  NOW(),
  NOW()
FROM session_data sd
ON CONFLICT (session_id, term_name) DO NOTHING;

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active, start_date, end_date, created_at, updated_at)
SELECT 
  sd.school_id,
  sd.id,
  'Third Term',
  3,
  FALSE,
  DATE '2026-04-01',
  DATE '2026-07-31',
  NOW(),
  NOW()
FROM session_data sd
ON CONFLICT (session_id, term_name) DO NOTHING;

-- Create terms for previous session for history
WITH session_data_prev AS (
  SELECT id, school_id FROM academic_sessions WHERE session_year = '2024/2025' AND is_active = FALSE
)

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active, start_date, end_date, created_at, updated_at)
SELECT 
  sd.school_id,
  sd.id,
  'First Term',
  1,
  FALSE,
  DATE '2024-09-01',
  DATE '2024-11-30',
  NOW() - INTERVAL '1 year',
  NOW() - INTERVAL '1 year'
FROM session_data_prev sd
ON CONFLICT (session_id, term_name) DO NOTHING;

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active, start_date, end_date, created_at, updated_at)
SELECT 
  sd.school_id,
  sd.id,
  'Second Term',
  2,
  FALSE,
  DATE '2024-12-01',
  DATE '2025-03-31',
  NOW() - INTERVAL '1 year',
  NOW() - INTERVAL '1 year'
FROM session_data_prev sd
ON CONFLICT (session_id, term_name) DO NOTHING;

INSERT INTO academic_terms (school_id, session_id, term_name, term_order, is_active, start_date, end_date, created_at, updated_at)
SELECT 
  sd.school_id,
  sd.id,
  'Third Term',
  3,
  FALSE,
  DATE '2025-04-01',
  DATE '2025-07-31',
  NOW() - INTERVAL '1 year',
  NOW() - INTERVAL '1 year'
FROM session_data_prev sd
ON CONFLICT (session_id, term_name) DO NOTHING;

COMMIT;
