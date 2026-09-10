-- ============================================================================
-- MIGRATION 059: Fix CBT Term ID - Make Required & Backfill
-- ============================================================================
--
-- PURPOSE:
-- 1. Backfill NULL term_id on existing CBT exams
-- 2. Make term_id NOT NULL to enforce requirement
-- 3. Ensure score_sheets creation doesn't fail
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Backfill NULL term_id values
-- ============================================================================

-- First, check what academic_terms exist
-- Find the most recent term for each school
WITH recent_terms AS (
  SELECT DISTINCT ON (at.school_id) 
    at.id, 
    at.school_id,
    at.created_at
  FROM academic_terms at
  ORDER BY at.school_id, at.created_at DESC
)
UPDATE cbt_exams ce
SET term_id = rt.id
FROM recent_terms rt
WHERE ce.term_id IS NULL 
  AND ce.school_id = rt.school_id;

-- If still some NULL term_ids exist (no academic_terms found), 
-- use the FIRST term for each school
WITH first_terms AS (
  SELECT DISTINCT ON (at.school_id) 
    at.id, 
    at.school_id
  FROM academic_terms at
  ORDER BY at.school_id, at.created_at ASC
)
UPDATE cbt_exams ce
SET term_id = ft.id
FROM first_terms ft
WHERE ce.term_id IS NULL 
  AND ce.school_id = ft.school_id;

-- Fallback: if STILL NULL, assign to any available term
UPDATE cbt_exams
SET term_id = (SELECT id FROM academic_terms LIMIT 1)
WHERE term_id IS NULL;

-- ============================================================================
-- STEP 2: Add NOT NULL constraint
-- ============================================================================

ALTER TABLE cbt_exams
ALTER COLUMN term_id SET NOT NULL;

-- ============================================================================
-- STEP 3: Ensure FK relationship is correct
-- ============================================================================

-- Drop old constraint if it exists
ALTER TABLE cbt_exams
DROP CONSTRAINT IF EXISTS cbt_exams_term_id_fkey;

-- Add correct FK to academic_terms (with cascade delete)
ALTER TABLE cbt_exams
ADD CONSTRAINT cbt_exams_term_id_fkey 
  FOREIGN KEY (term_id) 
  REFERENCES academic_terms(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Ensure cbt_submissions inherit term_id correctly
-- ============================================================================

-- Backfill NULL term_id in cbt_submissions from their parent exams
UPDATE cbt_submissions cs
SET term_id = ce.term_id
FROM cbt_exams ce
WHERE cs.cbt_exam_id = ce.id 
  AND cs.term_id IS NULL;

-- Make cbt_submissions.term_id NOT NULL
ALTER TABLE cbt_submissions
ALTER COLUMN term_id SET NOT NULL;

COMMIT;
