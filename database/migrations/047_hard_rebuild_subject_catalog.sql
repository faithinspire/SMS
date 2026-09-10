-- ============================================================================
-- HARD REBUILD: Complete Subject Catalog Replacement
-- Date: August 31, 2026
-- Purpose: Replace old subject system with comprehensive, canonical catalog
-- 
-- IMPORTANT: This migration:
-- 1. Preserves historical results/CBT/scores (remapping where necessary)
-- 2. Removes only DEFAULT subject entries (not school-specific customizations)
-- 3. Does NOT delete related records (results, CBT, scores)
-- 4. Makes the new subject catalog the system-wide default
-- ============================================================================

-- STEP 1: Backup old subjects for reference (optional - comment out if not needed)
-- CREATE TABLE subjects_old_backup AS SELECT * FROM subjects;

-- STEP 2: Identify which subjects to preserve (school-specific or with data)
-- We'll preserve subjects that have actual usage (score sheets, CBT exams, student assignments)

-- STEP 3: Remove old DEFAULT subjects (ones created by system initialization)
-- These are identified by being in 'system' schools or having no foreign key references
DELETE FROM subjects
WHERE school_id IN (SELECT id FROM schools WHERE LOWER(name) LIKE '%default%' OR LOWER(name) LIKE '%system%')
AND NOT EXISTS (
  SELECT 1 FROM score_sheets WHERE score_sheets.subject_id = subjects.id
)
AND NOT EXISTS (
  SELECT 1 FROM cbt_exams WHERE cbt_exams.subject_id = subjects.id
)
AND NOT EXISTS (
  SELECT 1 FROM student_subjects WHERE student_subjects.subject_id = subjects.id
)
AND NOT EXISTS (
  SELECT 1 FROM subject_teacher_assignments WHERE subject_teacher_assignments.subject_id = subjects.id
);

-- STEP 4: For each active school, create the NEW CANONICAL SUBJECT CATALOG
-- This uses a stored procedure to insert subjects idempotently

CREATE OR REPLACE FUNCTION populate_canonical_subjects_for_school(p_school_id UUID)
RETURNS TABLE (inserted_count INT, duplicates_skipped INT) AS $$
DECLARE
  v_inserted INT := 0;
  v_skipped INT := 0;
  v_subject_row RECORD;
  v_new_catalog JSON;
BEGIN
  -- Define the complete new subject catalog as JSON
  -- Each subject has: name, code, section (EARLY_YEARS|PRIMARY|JUNIOR_SECONDARY|SENIOR_SECONDARY|TECHNICAL), levels, applicable_to_levels
  
  v_new_catalog := '[
    {
      "name": "English Language",
      "code": "ENG",
      "section": "ALL",
      "applicable_to_levels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Mathematics",
      "code": "MATH",
      "section": "ALL",
      "applicable_to_levels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "General Science",
      "code": "SCI",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY"
    },
    {
      "name": "Basic Science",
      "code": "BSC",
      "section": "JUNIOR_SECONDARY",
      "applicable_to_levels": [9, 10, 11],
      "department": null,
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Physics",
      "code": "PHY",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "SCIENCE",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Chemistry",
      "code": "CHE",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "SCIENCE",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Biology",
      "code": "BIO",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "SCIENCE",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Further Mathematics",
      "code": "FMATH",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "SCIENCE",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Accounting",
      "code": "ACC",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "COMMERCIAL",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Commerce",
      "code": "COM",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "COMMERCIAL",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Economics",
      "code": "ECO",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "COMMERCIAL",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "History",
      "code": "HIS",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "ARTS",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Government",
      "code": "GOV",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "ARTS",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Literature in English",
      "code": "LIT",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "ARTS",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "French Language",
      "code": "FRE",
      "section": "JUNIOR_SECONDARY",
      "applicable_to_levels": [9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Physical Education",
      "code": "PE",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Computer Studies",
      "code": "CS",
      "section": "JUNIOR_SECONDARY",
      "applicable_to_levels": [9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Social Studies",
      "code": "SS",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY"
    },
    {
      "name": "Music",
      "code": "MUS",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Visual Arts",
      "code": "VAR",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Agricultural Science",
      "code": "AGR",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "SCIENCE",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Technical Drawing",
      "code": "TD",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [12, 13, 14],
      "department": "TECHNICAL",
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Home Economics",
      "code": "HEC",
      "section": "JUNIOR_SECONDARY",
      "applicable_to_levels": [9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Civic Education",
      "code": "CIV",
      "section": "JUNIOR_SECONDARY",
      "applicable_to_levels": [9, 10, 11],
      "department": null,
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Geography",
      "code": "GEO",
      "section": "SENIOR_SECONDARY",
      "applicable_to_levels": [9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_SECONDARY"
    },
    {
      "name": "Christian Religious Studies",
      "code": "CRS",
      "section": "ALL",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Islamic Studies",
      "code": "ISS",
      "section": "ALL",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Health Education",
      "code": "HEA",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Yoruba Language",
      "code": "YOR",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Igbo Language",
      "code": "IGB",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    },
    {
      "name": "Hausa Language",
      "code": "HAU",
      "section": "PRIMARY",
      "applicable_to_levels": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "department": null,
      "curriculum": "NIGERIAN_PRIMARY_SECONDARY"
    }
  ]'::JSON;

  -- Iterate through each subject in the catalog
  FOR v_subject_row IN 
    SELECT json_object_keys(v_new_catalog->'0') AS keys
    UNION ALL SELECT json_object_keys(v_new_catalog->'1')
  LOOP
    -- Insert each subject, skipping if already exists
    INSERT INTO subjects (school_id, name, code, applicable_to_levels)
    SELECT 
      p_school_id,
      value->>'name',
      value->>'code',
      ARRAY(SELECT json_array_elements_text(value->'applicable_to_levels'))::INT[]
    FROM json_array_elements(v_new_catalog) AS value
    WHERE NOT EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.school_id = p_school_id
      AND s.name = value->>'name'
    )
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_skipped;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Execute for all active schools
DO $$
DECLARE
  v_school_record RECORD;
  v_result RECORD;
BEGIN
  FOR v_school_record IN SELECT id, name FROM schools WHERE status = 'ACTIVE' OR status IS NULL LOOP
    SELECT INTO v_result * FROM populate_canonical_subjects_for_school(v_school_record.id);
    RAISE NOTICE 'School: %, Inserted: %, Skipped: %', v_school_record.name, v_result.inserted_count, v_result.duplicates_skipped;
  END LOOP;
END $$;

-- STEP 6: Verify insertion
SELECT 
  s.name as school_name,
  COUNT(*) as total_subjects,
  COUNT(DISTINCT (unnest(subjects.applicable_to_levels))) as levels_covered
FROM schools s
LEFT JOIN subjects ON subjects.school_id = s.id
WHERE s.status = 'ACTIVE' OR s.status IS NULL
GROUP BY s.name
ORDER BY s.name;

-- STEP 7: Check for orphaned subjects (with no references)
SELECT 
  s.id,
  s.name,
  s.code,
  COALESCE(ss.count, 0) as student_count,
  COALESCE(ts.count, 0) as teacher_count,
  COALESCE(sc.count, 0) as score_count,
  COALESCE(cbt.count, 0) as cbt_count
FROM subjects s
LEFT JOIN schools sch ON s.school_id = sch.id
LEFT JOIN (SELECT subject_id, COUNT(*) as count FROM student_subjects GROUP BY subject_id) ss ON s.id = ss.subject_id
LEFT JOIN (SELECT subject_id, COUNT(*) as count FROM subject_teacher_assignments GROUP BY subject_id) ts ON s.id = ts.subject_id
LEFT JOIN (SELECT subject_id, COUNT(*) as count FROM score_sheets GROUP BY subject_id) sc ON s.id = sc.subject_id
LEFT JOIN (SELECT subject_id, COUNT(*) as count FROM cbt_exams GROUP BY subject_id) cbt ON s.id = cbt.subject_id
WHERE sch.is_active = true
AND COALESCE(ss.count, 0) = 0
AND COALESCE(ts.count, 0) = 0
AND COALESCE(sc.count, 0) = 0
AND COALESCE(cbt.count, 0) = 0
ORDER BY s.name;
