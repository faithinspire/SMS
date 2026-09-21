-- ============================================================================
-- Migration 133: Refresh PostgREST Schema Cache
-- ============================================================================
-- Supabase caches schema. This forces a cache refresh by creating a trigger
-- that updates the schema_version, forcing PostgREST to reload

-- IMPORTANT: After running this, restart Supabase to clear the PostgREST cache

-- STEP 1: Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 2: Create a schema version table for cache invalidation
CREATE TABLE IF NOT EXISTS _schema_version (
  id INT PRIMARY KEY DEFAULT 1,
  version BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO _schema_version (id, version) VALUES (1, EXTRACT(EPOCH FROM NOW())::BIGINT) 
ON CONFLICT (id) DO UPDATE SET version = EXTRACT(EPOCH FROM NOW())::BIGINT, updated_at = NOW();

-- STEP 3: Force schema reload by triggering a comment update
COMMENT ON TABLE broadcasts IS 'schema_version_' || (SELECT version FROM _schema_version WHERE id = 1)::TEXT;
COMMENT ON TABLE broadcast_recipients IS 'schema_version_' || (SELECT version FROM _schema_version WHERE id = 1)::TEXT;

-- STEP 4: Verify tables exist with correct schema
SELECT 'broadcasts' as table_name, array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'broadcasts'
GROUP BY table_name

UNION ALL

SELECT 'broadcast_recipients' as table_name, array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'broadcast_recipients'
GROUP BY table_name;
