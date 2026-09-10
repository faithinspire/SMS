-- ============================================================================
-- EXACT SQL COMMANDS FOR score_sheets.term_id FK MIGRATION
-- ============================================================================
-- Copy and paste these commands directly into Supabase SQL Editor
-- Execute each command separately to see results clearly
-- ============================================================================

-- ============================================================================
-- COMMAND 1: CHECK CURRENT FOREIGN KEY
-- ============================================================================
-- Run this first to see what the current constraint looks like
-- 

SELECT 
  kcu.constraint_name,
  kcu.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name 
  AND kcu.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
  AND kcu.table_schema = rc.constraint_schema
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id'
  AND kcu.constraint_type = 'FOREIGN KEY';

-- Expected result:
-- If references 'terms' table: You need to run Commands 2 & 3
-- If references 'academic_terms' table with CASCADE: Already migrated ✓

-- ============================================================================
-- COMMAND 2: DROP EXISTING FOREIGN KEY
-- ============================================================================
-- This removes the old constraint pointing to 'terms' table
-- Run this only if Command 1 shows the constraint references 'terms'
-- 

ALTER TABLE score_sheets
DROP CONSTRAINT fk_score_sheets_term_id;

-- Note: If the constraint name is different, update the command above
-- with the actual constraint name from Command 1 output

-- ============================================================================
-- COMMAND 3: ADD NEW FOREIGN KEY WITH CASCADE DELETE
-- ============================================================================
-- This adds the new constraint pointing to 'academic_terms' with CASCADE
-- Run this after Command 2
-- 

ALTER TABLE score_sheets
ADD CONSTRAINT fk_score_sheets_term_id_academic_terms
FOREIGN KEY (term_id) 
REFERENCES academic_terms(id) 
ON DELETE CASCADE;

-- This ensures:
-- ✓ term_id can only reference valid academic_terms.id
-- ✓ When an academic_term is deleted, related score_sheets are deleted
-- ✓ Data integrity is maintained

-- ============================================================================
-- COMMAND 4: VERIFY NEW CONSTRAINT IS CORRECT
-- ============================================================================
-- Run this to confirm the migration was successful
-- 

SELECT 
  kcu.constraint_name,
  kcu.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name 
  AND kcu.table_schema = ccu.table_schema
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
  AND kcu.table_schema = rc.constraint_schema
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id'
  AND kcu.constraint_type = 'FOREIGN KEY';

-- Expected result after migration:
-- constraint_name: fk_score_sheets_term_id_academic_terms
-- foreign_table_name: academic_terms
-- delete_rule: CASCADE

-- ============================================================================
-- COMMAND 5: FINAL VERIFICATION & STATUS
-- ============================================================================
-- Run this for detailed verification of all requirements
-- 

DO $$
DECLARE
  constraint_exists BOOLEAN;
  references_academic_terms BOOLEAN;
  has_cascade_delete BOOLEAN;
BEGIN
  RAISE NOTICE '=== VERIFICATION REPORT ===';
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND kcu.constraint_type = 'FOREIGN KEY'
  ) INTO constraint_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.constraint_column_usage ccu 
      ON kcu.constraint_name = ccu.constraint_name
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND kcu.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'academic_terms'
  ) INTO references_academic_terms;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu 
      ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND rc.delete_rule = 'CASCADE'
  ) INTO has_cascade_delete;

  RAISE NOTICE 'FK Constraint exists: %', constraint_exists;
  RAISE NOTICE 'References academic_terms: %', references_academic_terms;
  RAISE NOTICE 'Has ON DELETE CASCADE: %', has_cascade_delete;
  
  IF constraint_exists AND references_academic_terms AND has_cascade_delete THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS! Migration complete and verified:';
    RAISE NOTICE '   • FK constraint is in place';
    RAISE NOTICE '   • References academic_terms(id)';
    RAISE NOTICE '   • ON DELETE CASCADE enabled';
  ELSE
    RAISE WARNING '❌ Verification failed - check requirements above';
  END IF;
END $$;

-- ============================================================================
-- BONUS: VIEW ALL FOREIGN KEYS ON score_sheets TABLE
-- ============================================================================
-- Shows all foreign key constraints on score_sheets
-- 

SELECT 
  kcu.constraint_name,
  kcu.column_name as source_column,
  ccu.table_name as references_table,
  ccu.column_name as references_column,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.column_name;

-- ============================================================================
-- QUICK REFERENCE
-- ============================================================================
--
-- Run Commands in Order:
-- 1. Run COMMAND 1 to check current state
-- 2. If references 'terms', run COMMAND 2 (drop old constraint)
-- 3. Run COMMAND 3 (add new constraint)
-- 4. Run COMMAND 4 (verify it was created)
-- 5. Run COMMAND 5 (final verification & status report)
--
-- Success Indicators:
-- ✓ No errors during execution
-- ✓ COMMAND 4 output shows: 
--   - constraint_name: fk_score_sheets_term_id_academic_terms
--   - foreign_table_name: academic_terms
--   - delete_rule: CASCADE
-- ✓ COMMAND 5 output shows all TRUE values and SUCCESS message
--
-- ============================================================================
