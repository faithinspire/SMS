-- ============================================================================
-- SIMPLE SQL - Just verify the schema is correct
-- Copy and paste THIS into Supabase SQL Editor
-- ============================================================================

-- Verify broadcasts table
SELECT 'broadcasts' as table_name, 
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'broadcasts'
GROUP BY table_name;

-- Verify broadcast_recipients table
SELECT 'broadcast_recipients' as table_name,
       array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'broadcast_recipients'
GROUP BY table_name;
