-- ============================================================================
-- CREATE STREAMS TABLE
-- Streams are used for SS1-SS3 (Senior Secondary 1-3) classes
-- E.g., Science, Commercial, Humanities, Technical
-- ============================================================================

CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_streams_school_id ON streams(school_id);
CREATE INDEX IF NOT EXISTS idx_streams_name ON streams(name);

-- ============================================================================
-- POPULATE EXISTING SCHOOLS WITH STREAMS (if not already present)
-- ============================================================================

DO $$
DECLARE
  school_rec RECORD;
  stream_name TEXT;
BEGIN
  FOR school_rec IN SELECT DISTINCT school_id FROM classes WHERE school_id IS NOT NULL LOOP
    FOREACH stream_name IN ARRAY ARRAY['Science', 'Commercial', 'Humanities', 'Technical'] LOOP
      INSERT INTO streams (id, school_id, name)
      VALUES (gen_random_uuid(), school_rec.school_id, stream_name)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
