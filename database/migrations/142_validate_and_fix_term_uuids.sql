-- ============================================================================
-- Migration 142: Validate and Fix Term UUIDs
-- ============================================================================
-- ROOT CAUSE: CBT exam creation fails with "invalid input syntax for type uuid: term-1"
-- This happens when term IDs are generated as strings like "term-1" instead of UUIDs
-- 
-- SOLUTION:
-- 1. Identify all invalid term IDs in the terms table
-- 2. Replace string-based IDs with valid UUIDs
-- 3. Cascade the fix to all foreign key references (cbt_exams, score_sheets, etc.)
-- ============================================================================

-- Step 1: Add UUID column if it doesn't exist
ALTER TABLE terms ADD COLUMN IF NOT EXISTS id_new UUID;

-- Step 2: Identify and fix invalid term IDs
-- If a term ID is not a valid UUID (matches 'term-X' pattern or similar), regenerate it
DO $$
DECLARE
  v_term RECORD;
  v_new_uuid UUID;
  v_uuid_regex TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  -- Find all terms with invalid IDs
  FOR v_term IN
    SELECT id, name, school_id
    FROM terms
    WHERE id::TEXT !~ v_uuid_regex
  LOOP
    v_new_uuid := gen_random_uuid();
    
    -- Log the fix
    RAISE NOTICE 'Fixing term ID: % -> % (term: %)', v_term.id, v_new_uuid, v_term.name;
    
    -- Update all foreign key references first (before changing PK)
    -- Update cbt_exams
    UPDATE cbt_exams SET term_id = v_new_uuid WHERE term_id = v_term.id::UUID;
    
    -- Update score_sheets if they reference terms
    UPDATE score_sheets SET term_id = v_new_uuid WHERE term_id = v_term.id::UUID;
    
    -- Update student_subjects if they reference terms
    UPDATE student_subjects SET term_id = v_new_uuid WHERE term_id = v_term.id::UUID;
    
    -- Update cbt_test_slots if they reference terms
    UPDATE cbt_test_slots SET term_id = v_new_uuid WHERE term_id = v_term.id::UUID;
    
    -- Update assignments if they reference terms
    UPDATE assignments SET term_id = v_new_uuid WHERE term_id = v_term.id::UUID;
    
    -- Finally, update the term itself
    UPDATE terms SET id = v_new_uuid WHERE id = v_term.id;
  END LOOP;
END $$;

-- Step 3: Ensure no NULL IDs exist
-- Generate UUID for any terms with NULL id
UPDATE terms 
SET id = gen_random_uuid() 
WHERE id IS NULL;

-- Step 4: Add constraints to prevent invalid IDs in the future
-- Add a check constraint to ensure ID is always a valid UUID
DO $$
BEGIN
  ALTER TABLE terms ADD CONSTRAINT terms_id_is_uuid 
    CHECK (id IS NOT NULL);
  ALTER TABLE terms ADD CONSTRAINT terms_id_valid_uuid
    CHECK (id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraints already exist or could not be created: %', SQLERR MESSAGE;
END $$;

-- Step 5: Verify CBT exams have valid term_ids
-- Ensure no cbt_exams have invalid term_id references
DELETE FROM cbt_exams 
WHERE term_id NOT IN (SELECT id FROM terms)
  AND term_id IS NOT NULL;

-- Step 6: Ensure academic_sessions also have valid UUIDs
UPDATE academic_sessions 
SET id = gen_random_uuid() 
WHERE id IS NULL 
   OR id::TEXT !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 7: Create a trigger to auto-generate UUID for new terms if not provided
CREATE OR REPLACE FUNCTION ensure_term_uuid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS terms_auto_uuid ON terms;
CREATE TRIGGER terms_auto_uuid
BEFORE INSERT ON terms
FOR EACH ROW
EXECUTE FUNCTION ensure_term_uuid();

-- Step 8: Verify the fix worked
DO $$
DECLARE
  v_invalid_count INT;
  v_total_count INT;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM terms
  WHERE id::TEXT !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  SELECT COUNT(*) INTO v_total_count FROM terms;
  
  IF v_invalid_count > 0 THEN
    RAISE WARNING 'ALERT: Still have % invalid term IDs out of % total terms', v_invalid_count, v_total_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All % term IDs are now valid UUIDs', v_total_count;
  END IF;
END $$;
