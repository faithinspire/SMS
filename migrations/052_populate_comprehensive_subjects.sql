-- Migration 052: Populate comprehensive Nigerian subject catalog
-- Purpose: Create complete subject list for primary and secondary education
-- Date: 2026-08-28
-- NOTE: Run this AFTER creating schools in the system

-- Insert PRIMARY SUBJECTS (Levels 1-6, Ages 6-12)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  'English Language' as name,
  'ENG' as code,
  'GENERAL' as section,
  level,
  'LANGUAGES' as department,
  true,
  'CORE',
  ARRAY[level] as applicable_to_levels,
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('PRIMARY', 'BOTH')
) schools
CROSS JOIN GENERATE_SERIES(1, 6) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = 'English Language'
  AND level = level
);

-- MATHEMATICS (Primary)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  'Mathematics' as name,
  'MATH' as code,
  'GENERAL' as section,
  level,
  'MATHEMATICS' as department,
  true,
  'CORE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('PRIMARY', 'BOTH')
) schools
CROSS JOIN GENERATE_SERIES(1, 6) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = 'Mathematics'
  AND level = level
);

-- SCIENCE (Primary)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  'Science' as name,
  'SCI' as code,
  'GENERAL' as section,
  level,
  'SCIENCE' as department,
  true,
  'CORE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('PRIMARY', 'BOTH')
) schools
CROSS JOIN GENERATE_SERIES(1, 6) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = 'Science'
  AND level = level
);

-- SOCIAL STUDIES (Primary)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  'Social Studies' as name,
  'SS' as code,
  'GENERAL' as section,
  level,
  'SOCIAL_STUDIES' as department,
  true,
  'CORE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('PRIMARY', 'BOTH')
) schools
CROSS JOIN GENERATE_SERIES(1, 6) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = 'Social Studies'
  AND level = level
);

-- PRIMARY ELECTIVES (Levels 1-6)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  subject_name,
  code,
  'GENERAL',
  level,
  department,
  true,
  'ELECTIVE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('PRIMARY', 'BOTH')
) schools
CROSS JOIN (
  SELECT 
    'Civic Education' as subject_name, 'CIVIC' as code, 'SOCIAL_STUDIES' as department
    UNION ALL SELECT 'Physical Education', 'PE', 'SPORTS'
    UNION ALL SELECT 'Music', 'MUS', 'ARTS'
    UNION ALL SELECT 'Visual Arts', 'ART', 'ARTS'
    UNION ALL SELECT 'Computer Studies', 'ICT', 'TECHNOLOGY'
) electives
CROSS JOIN GENERATE_SERIES(1, 6) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = subject_name
  AND level = level
);

-- SECONDARY SUBJECTS (JSS: Levels 7-9)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  subject_name,
  code,
  'GENERAL',
  level,
  department,
  true,
  'CORE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('SECONDARY', 'BOTH')
) schools
CROSS JOIN (
  SELECT 'English Language' as subject_name, 'ENG' as code, 'LANGUAGES' as department
  UNION ALL SELECT 'Mathematics', 'MATH', 'MATHEMATICS'
  UNION ALL SELECT 'Science', 'SCI', 'SCIENCE'
  UNION ALL SELECT 'Social Studies', 'SS', 'SOCIAL_STUDIES'
  UNION ALL SELECT 'Civic Education', 'CIVIC', 'SOCIAL_STUDIES'
  UNION ALL SELECT 'Geography', 'GEO', 'SOCIAL_STUDIES'
  UNION ALL SELECT 'History', 'HIST', 'SOCIAL_STUDIES'
  UNION ALL SELECT 'Biology', 'BIO', 'SCIENCE'
  UNION ALL SELECT 'Chemistry', 'CHEM', 'SCIENCE'
  UNION ALL SELECT 'Physics', 'PHY', 'SCIENCE'
  UNION ALL SELECT 'Computer Studies', 'ICT', 'TECHNOLOGY'
) subjects_jss
CROSS JOIN GENERATE_SERIES(7, 9) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = subject_name
  AND level = level
);

-- SECONDARY ELECTIVES (JSS: Levels 7-9)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  subject_name,
  code,
  'GENERAL',
  level,
  department,
  true,
  'ELECTIVE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('SECONDARY', 'BOTH')
) schools
CROSS JOIN (
  SELECT 'French Language' as subject_name, 'FRE' as code, 'LANGUAGES' as department
  UNION ALL SELECT 'Yoruba Language', 'YOR', 'LANGUAGES'
  UNION ALL SELECT 'Igbo Language', 'IGB', 'LANGUAGES'
  UNION ALL SELECT 'Arabic Language', 'ARB', 'LANGUAGES'
  UNION ALL SELECT 'Physical Education', 'PE', 'SPORTS'
  UNION ALL SELECT 'Music', 'MUS', 'ARTS'
  UNION ALL SELECT 'Visual Arts', 'ART', 'ARTS'
  UNION ALL SELECT 'Agricultural Science', 'AGR', 'AGRICULTURE'
) electives_jss
CROSS JOIN GENERATE_SERIES(7, 9) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = subject_name
  AND level = level
);

-- SENIOR SECONDARY SUBJECTS (SSS: Levels 10-12) - SCIENCE STREAM
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  subject_name,
  code,
  'SCIENCE',
  level,
  department,
  true,
  'CORE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('SECONDARY', 'BOTH')
) schools
CROSS JOIN (
  SELECT 'English Language' as subject_name, 'ENG' as code, 'LANGUAGES' as department
  UNION ALL SELECT 'Mathematics', 'MATH', 'MATHEMATICS'
  UNION ALL SELECT 'Biology', 'BIO', 'SCIENCE'
  UNION ALL SELECT 'Chemistry', 'CHEM', 'SCIENCE'
  UNION ALL SELECT 'Physics', 'PHY', 'SCIENCE'
) subjects_sss_science
CROSS JOIN GENERATE_SERIES(10, 12) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = subject_name
  AND section = 'SCIENCE'
  AND level = level
);

-- SENIOR SECONDARY SUBJECTS (SSS: Levels 10-12) - HUMANITIES STREAM
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  subject_name,
  code,
  'HUMANITIES',
  level,
  department,
  true,
  'CORE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('SECONDARY', 'BOTH')
) schools
CROSS JOIN (
  SELECT 'English Language' as subject_name, 'ENG' as code, 'LANGUAGES' as department
  UNION ALL SELECT 'Mathematics', 'MATH', 'MATHEMATICS'
  UNION ALL SELECT 'History', 'HIST', 'SOCIAL_STUDIES'
  UNION ALL SELECT 'Geography', 'GEO', 'SOCIAL_STUDIES'
  UNION ALL SELECT 'Civic Education', 'CIVIC', 'SOCIAL_STUDIES'
) subjects_sss_hum
CROSS JOIN GENERATE_SERIES(10, 12) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = subject_name
  AND section = 'HUMANITIES'
  AND level = level
);

-- SENIOR SECONDARY SUBJECTS (SSS: Levels 10-12) - COMMERCIAL STREAM
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  subject_name,
  code,
  'COMMERCIAL',
  level,
  department,
  true,
  'CORE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('SECONDARY', 'BOTH')
) schools
CROSS JOIN (
  SELECT 'English Language' as subject_name, 'ENG' as code, 'LANGUAGES' as department
  UNION ALL SELECT 'Mathematics', 'MATH', 'MATHEMATICS'
  UNION ALL SELECT 'Accounting', 'ACC', 'COMMERCE'
  UNION ALL SELECT 'Economics', 'ECON', 'COMMERCE'
  UNION ALL SELECT 'Business Studies', 'BUS', 'COMMERCE'
) subjects_sss_comm
CROSS JOIN GENERATE_SERIES(10, 12) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = subject_name
  AND section = 'COMMERCIAL'
  AND level = level
);

-- ELECTIVES FOR ALL SSS STREAMS (Levels 10-12)
INSERT INTO subjects (school_id, name, code, section, level, department, is_active, subject_type, applicable_to_levels, created_at)
SELECT 
  id as school_id,
  subject_name,
  code,
  'GENERAL',
  level,
  department,
  true,
  'ELECTIVE',
  ARRAY[level],
  NOW()
FROM (
  SELECT id FROM schools WHERE school_type IN ('SECONDARY', 'BOTH')
) schools
CROSS JOIN (
  SELECT 'French Language' as subject_name, 'FRE' as code, 'LANGUAGES' as department
  UNION ALL SELECT 'Computer Science', 'CS', 'TECHNOLOGY'
  UNION ALL SELECT 'Agricultural Science', 'AGR', 'AGRICULTURE'
  UNION ALL SELECT 'Physical Education', 'PE', 'SPORTS'
  UNION ALL SELECT 'Music', 'MUS', 'ARTS'
  UNION ALL SELECT 'Visual Arts', 'ART', 'ARTS'
  UNION ALL SELECT 'Literature in English', 'LIT', 'LANGUAGES'
) electives_sss
CROSS JOIN GENERATE_SERIES(10, 12) as level
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE school_id = schools.id 
  AND name = subject_name
  AND level = level
);

-- Confirm migration with summary
SELECT 
  'Migration 052 completed - comprehensive subject catalog populated' AS status,
  COUNT(*) as total_subjects_created
FROM subjects
WHERE created_at > NOW() - INTERVAL '1 minute';
