-- Migration 079: ZERO-STORAGE EMERGENCY FIX
-- This migration uses ONLY UPDATE statements (no INSERT, no indexes, no temp files)
-- It will work even with disk completely full

-- ============================================================================
-- STEP 1: Update subjects to fix applicable_to_levels (NO NEW DATA)
-- ============================================================================

-- For PRIMARY schools: set applicable_to_levels
UPDATE subjects s
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE (s.applicable_to_levels IS NULL OR array_length(s.applicable_to_levels, 1) = 0)
  AND EXISTS (
    SELECT 1 FROM schools sch 
    WHERE sch.id = s.school_id 
    AND sch.type IN ('PRIMARY', 'BOTH')
  );

-- For SECONDARY schools: set applicable_to_levels  
UPDATE subjects s
SET applicable_to_levels = ARRAY[9,10,11,12,13,14]
WHERE (s.applicable_to_levels IS NULL OR array_length(s.applicable_to_levels, 1) = 0)
  AND EXISTS (
    SELECT 1 FROM schools sch 
    WHERE sch.id = s.school_id 
    AND sch.type IN ('SECONDARY', 'BOTH')
  );

-- ============================================================================
-- STEP 2: Mark completion
-- ============================================================================

SELECT 'MIGRATION 079 COMPLETE - applicable_to_levels fixed' as status;
SELECT COUNT(*) as subjects_updated FROM subjects WHERE applicable_to_levels IS NOT NULL;
