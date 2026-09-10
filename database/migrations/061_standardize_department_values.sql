-- ============================================================================
-- MIGRATION 061: Standardize Department Values
-- ============================================================================
--
-- PURPOSE:
-- Ensure all student records have valid department values that match the constraint:
-- NULL, 'SCIENCE', 'COMMERCIAL', 'HUMANITIES', 'TECHNICAL', 'VOCATIONAL'
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Normalize existing department values to uppercase
-- ============================================================================

UPDATE students
SET department = UPPER(department)
WHERE department IS NOT NULL
  AND department != UPPER(department);

-- ============================================================================
-- STEP 2: Map common variations to standard values
-- ============================================================================

-- Map lowercase variants
UPDATE students SET department = 'SCIENCE' WHERE department IN ('science', 'Science', 'SCIENCES', 'Sciences');
UPDATE students SET department = 'COMMERCIAL' WHERE department IN ('commercial', 'Commercial', 'COMMERCE', 'Commerce');
UPDATE students SET department = 'HUMANITIES' WHERE department IN ('humanities', 'Humanities', 'ARTS', 'Arts');
UPDATE students SET department = 'TECHNICAL' WHERE department IN ('technical', 'Technical', 'TECHNICALS', 'Technicals');
UPDATE students SET department = 'VOCATIONAL' WHERE department IN ('vocational', 'Vocational', 'VOCATIONAL_TRAINING', 'Vocational Training');

-- ============================================================================
-- STEP 3: Fix invalid values that don't match constraint
-- ============================================================================

-- If a value is not in the allowed list, set to NULL
UPDATE students
SET department = NULL
WHERE department IS NOT NULL
  AND department NOT IN ('SCIENCE', 'COMMERCIAL', 'HUMANITIES', 'TECHNICAL', 'VOCATIONAL');

COMMIT;
