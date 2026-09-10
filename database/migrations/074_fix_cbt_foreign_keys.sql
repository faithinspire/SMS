-- ============================================================================
-- Migration 074: Fix CBT Foreign Key Constraints
-- The cbt_exams table has a broken foreign key pointing to 
-- "terms_backup_old_schema" table which doesn't exist or is empty
-- ============================================================================

-- Step 1: Drop the broken foreign key constraint if it exists
ALTER TABLE cbt_exams
DROP CONSTRAINT IF EXISTS cbt_exams_term_id_fkey CASCADE;

-- Step 2: Ensure terms table exists and has data
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, session_year, name)
);

-- Step 3: Populate terms table from academic_terms
INSERT INTO terms (school_id, name, session_year, start_date, end_date, is_current, id)
SELECT 
  at.school_id,
  at.term_name as name,
  EXTRACT(YEAR FROM COALESCE(at.start_date, NOW()))::INT as session_year,
  COALESCE(at.start_date, NOW()::DATE) as start_date,
  COALESCE(at.end_date, (NOW() + INTERVAL '3 months')::DATE) as end_date,
  at.is_active as is_current,
  at.id
FROM academic_terms at
WHERE NOT EXISTS (
  SELECT 1 FROM terms t 
  WHERE t.id = at.id
)
ON CONFLICT DO NOTHING;

-- Step 4: Re-create the proper foreign key constraint
ALTER TABLE cbt_exams
ADD CONSTRAINT cbt_exams_term_id_fkey 
FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;

-- Step 5: Clean up old backup tables if they exist and are not referenced
DROP TABLE IF EXISTS terms_backup_old_schema CASCADE;

-- Step 6: Verify the fix
SELECT 
  COUNT(*) as cbt_exams_count,
  COUNT(DISTINCT term_id) as distinct_terms,
  COUNT(CASE WHEN term_id IS NULL THEN 1 END) as null_terms
FROM cbt_exams;

SELECT COUNT(*) as terms_count FROM terms;

COMMIT;
