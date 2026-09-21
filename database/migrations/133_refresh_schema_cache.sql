-- ============================================================================
-- Migration 133: Verify Broadcasts Schema After Nuclear Fix
-- ============================================================================
-- Verify that broadcasts and broadcast_recipients tables exist with correct schema
-- No cache refresh needed - PostgREST will auto-reload on next query

-- STEP 1: Verify broadcasts table structure
SELECT 'broadcasts' as table_name, 
       array_agg(column_name ORDER BY ordinal_position) as columns,
       COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'broadcasts'
GROUP BY table_name;

-- STEP 2: Verify broadcast_recipients table structure
SELECT 'broadcast_recipients' as table_name,
       array_agg(column_name ORDER BY ordinal_position) as columns,
       COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'broadcast_recipients'
GROUP BY table_name;

-- STEP 3: Verify foreign keys exist
SELECT constraint_name, table_name, column_name, referenced_table_name, referenced_column_name
FROM information_schema.key_column_usage
WHERE table_name IN ('broadcasts', 'broadcast_recipients')
  AND referenced_table_name IS NOT NULL;

-- STEP 4: Verify indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('broadcasts', 'broadcast_recipients')
ORDER BY tablename, indexname;
