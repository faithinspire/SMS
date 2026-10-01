-- ============================================================================
-- DIAGNOSTIC: Check actual academic_terms schema
-- ============================================================================

-- Step 1: See what columns actually exist in academic_terms
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'academic_terms'
ORDER BY ordinal_position;

-- Step 2: See what columns exist in academic_sessions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'academic_sessions'
ORDER BY ordinal_position;

-- Step 3: Check existing data in academic_terms to see the structure
SELECT * FROM academic_terms LIMIT 3;

-- Step 4: Check existing data in academic_sessions
SELECT * FROM academic_sessions LIMIT 3;
