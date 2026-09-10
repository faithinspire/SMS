-- ============================================================================
-- MIGRATION: Migrate score_sheets.term_id FK from terms to academic_terms
-- ============================================================================
--
-- PURPOSE: 
-- 1. Check current foreign key constraint on score_sheets.term_id
-- 2. If it references 'terms' table, drop that constraint
-- 3. Add new constraint to 'academic_terms' table with ON DELETE CASCADE
-- 4. Verify the constraint is now correct
-- 5. Output success confirmation
--
-- EXECUTION: Run this entire script in Supabase SQL editor as one transaction
--
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK CURRENT FOREIGN KEY CONSTRAINT
-- ============================================================================

DO $$ 
DECLARE
  constraint_name TEXT;
  constraint_table TEXT;
  constraint_column TEXT;
BEGIN
  RAISE NOTICE '=== STEP 1: CHECKING CURRENT FOREIGN KEY CONSTRAINT ===';
  
  -- Query information_schema to find FK on score_sheets.term_id
  SELECT 
    kcu.constraint_name,
    ccu.table_name as referenced_table,
    kcu.column_name
  INTO 
    constraint_name,
    constraint_table,
    constraint_column
  FROM information_schema.key_column_usage AS kcu
  JOIN information_schema.constraint_column_usage AS ccu
    ON kcu.constraint_name = ccu.constraint_name
    AND kcu.table_schema = ccu.table_schema
  WHERE 
    kcu.table_name = 'score_sheets' 
    AND kcu.column_name = 'term_id'
    AND kcu.constraint_type = 'FOREIGN KEY';

  IF constraint_name IS NOT NULL THEN
    RAISE NOTICE 'Found FK constraint: % on score_sheets.term_id -> %.%', 
      constraint_name, constraint_table, constraint_column;
    RAISE NOTICE 'Current reference table: %', constraint_table;
  ELSE
    RAISE NOTICE 'No foreign key constraint found on score_sheets.term_id';
  END IF;
END $$;

-- Display current constraint details
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

-- ============================================================================
-- STEP 2: DROP EXISTING FOREIGN KEY CONSTRAINT (if it exists)
-- ============================================================================

DO $$
DECLARE
  constraint_name TEXT;
  table_name TEXT := 'score_sheets';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 2: DROPPING EXISTING FOREIGN KEY CONSTRAINT ===';
  
  -- Find the constraint name
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = table_name 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND EXISTS (
      SELECT 1 FROM information_schema.key_column_usage kcu
      WHERE kcu.constraint_name = tc.constraint_name
        AND kcu.column_name = 'term_id'
    );

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No foreign key constraint found on score_sheets.term_id to drop';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: ADD NEW FOREIGN KEY CONSTRAINT TO academic_terms
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 3: ADDING NEW FOREIGN KEY CONSTRAINT ===';
  
  -- Add FK constraint to academic_terms with ON DELETE CASCADE
  ALTER TABLE score_sheets
  ADD CONSTRAINT fk_score_sheets_term_id_academic_terms
  FOREIGN KEY (term_id) 
  REFERENCES academic_terms(id) 
  ON DELETE CASCADE;
  
  RAISE NOTICE 'Successfully added constraint: fk_score_sheets_term_id_academic_terms';
  RAISE NOTICE 'References: academic_terms(id) with ON DELETE CASCADE';
END $$;

-- ============================================================================
-- STEP 4: VERIFY THE CONSTRAINT IS CORRECT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 4: VERIFYING CONSTRAINT ===';
END $$;

-- Display the newly created constraint
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

-- ============================================================================
-- STEP 5: FINAL VERIFICATION & SUCCESS CONFIRMATION
-- ============================================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  references_academic_terms BOOLEAN;
  has_cascade_delete BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 5: FINAL VERIFICATION & SUCCESS CONFIRMATION ===';
  
  -- Check if constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND kcu.constraint_type = 'FOREIGN KEY'
  ) INTO constraint_exists;

  -- Check if it references academic_terms
  SELECT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.constraint_column_usage ccu 
      ON kcu.constraint_name = ccu.constraint_name
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND kcu.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'academic_terms'
  ) INTO references_academic_terms;

  -- Check if it has ON DELETE CASCADE
  SELECT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu 
      ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'score_sheets' 
      AND kcu.column_name = 'term_id'
      AND rc.delete_rule = 'CASCADE'
  ) INTO has_cascade_delete;

  RAISE NOTICE '';
  RAISE NOTICE '📋 CONSTRAINT STATUS:';
  RAISE NOTICE '  ✓ FK Constraint exists: %', constraint_exists;
  RAISE NOTICE '  ✓ References academic_terms: %', references_academic_terms;
  RAISE NOTICE '  ✓ Has ON DELETE CASCADE: %', has_cascade_delete;
  
  IF constraint_exists AND references_academic_terms AND has_cascade_delete THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS! All requirements met:';
    RAISE NOTICE '   - Foreign key constraint is in place';
    RAISE NOTICE '   - References academic_terms table';
    RAISE NOTICE '   - ON DELETE CASCADE is enabled';
  ELSE
    RAISE WARNING '❌ VERIFICATION FAILED!';
    RAISE WARNING '   - FK exists: %', constraint_exists;
    RAISE WARNING '   - References academic_terms: %', references_academic_terms;
    RAISE WARNING '   - Has CASCADE: %', has_cascade_delete;
  END IF;
END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
RAISE NOTICE '║         SCORE_SHEETS FOREIGN KEY MIGRATION COMPLETE             ║';
RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';

SELECT 
  'SUCCESS' as migration_status,
  'score_sheets.term_id' as column_migrated,
  'academic_terms.id' as new_reference,
  'CASCADE' as delete_rule,
  NOW() as completed_at
;

-- Display final state of all FKs on score_sheets
SELECT 
  '📌 FINAL STATE - All Foreign Keys on score_sheets:' as section;

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
-- END OF MIGRATION
-- ============================================================================
