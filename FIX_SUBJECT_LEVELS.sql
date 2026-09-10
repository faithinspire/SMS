-- ============================================================================
-- FIX SUBJECT APPLICABLE LEVELS
-- ============================================================================
-- Ensure all subjects have applicable_to_levels populated
-- ============================================================================

-- Primary subjects (levels 1-6) - Primary school
UPDATE subjects 
SET applicable_to_levels = ARRAY[1,2,3,4,5,6]
WHERE applicable_to_levels = '{}'::integer[] OR applicable_to_levels IS NULL
  AND name IN (
    'English Language', 'English',
    'Mathematics', 'Math',
    'Science',
    'Social Studies', 'Social Science',
    'Civic Education', 'Civics',
    'Physical Education', 'PE', 'Physical Educ',
    'Art & Craft', 'Art',
    'Music',
    'Home Economics',
    'Information Technology', 'ICT', 'Computer Studies'
  );

-- Secondary subjects (levels 9-11) - Junior Secondary
UPDATE subjects
SET applicable_to_levels = ARRAY[9,10,11]
WHERE (applicable_to_levels = '{}'::integer[] OR applicable_to_levels IS NULL)
  AND name IN (
    'English', 'English Language',
    'Mathematics', 'Math',
    'Biology', 'Chemistry', 'Physics', 'Integrated Science',
    'History', 'Geography',
    'Civic Education', 'Civics',
    'Physical Education', 'PE',
    'Agricultural Science', 'Agriculture',
    'Technical Drawing',
    'Computer Science', 'Computing', 'Computer Studies',
    'French', 'Hausa', 'Yoruba', 'Igbo'
  );

-- Senior Secondary subjects (levels 12-14) - Senior Secondary
UPDATE subjects
SET applicable_to_levels = ARRAY[12,13,14]
WHERE (applicable_to_levels = '{}'::integer[] OR applicable_to_levels IS NULL)
  AND name IN (
    'English', 'English Language',
    'Mathematics', 'Math',
    'Economics', 'Accounting', 'Government',
    'Literature In English', 'Literature',
    'Further Mathematics',
    'Biology', 'Chemistry', 'Physics',
    'History', 'Geography',
    'Computer Science', 'Computing', 'Computer Studies',
    'Agricultural Science', 'Agriculture',
    'French', 'Arabic'
  );

-- For any STILL-EMPTY subjects, make them available to all levels as fallback
UPDATE subjects
SET applicable_to_levels = ARRAY[1,2,3,4,5,6,9,10,11,12,13,14]
WHERE applicable_to_levels = '{}'::integer[] OR applicable_to_levels IS NULL;

-- Verify the fix
SELECT 
  'Subject levels fixed' as status,
  COUNT(*) as total_subjects,
  COUNT(CASE WHEN applicable_to_levels = '{}' THEN 1 END) as empty_levels,
  COUNT(CASE WHEN applicable_to_levels != '{}' AND applicable_to_levels IS NOT NULL THEN 1 END) as populated
FROM subjects;
