-- ============================================================================
-- Migration 146: Complete Nigerian Curriculum for ALL Schools (PREP-SS3)
-- ============================================================================
-- Ensures EVERY school has complete subject curriculum with proper filtering

BEGIN;

-- ============================================================================
-- PREREQUISITE: Ensure columns exist (created by Migration 145)
-- ============================================================================
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS subject_type VARCHAR(50) DEFAULT 'CORE',
ADD COLUMN IF NOT EXISTS department VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- STEP 1: CREATE CANONICAL SUBJECT DEFINITIONS
-- ============================================================================

-- Temporary table to define all canonical subjects
CREATE TEMP TABLE canonical_subjects (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  levels INT[] NOT NULL,
  department VARCHAR(50),
  subject_type VARCHAR(50) DEFAULT 'CORE'
);

-- Insert canonical subjects
INSERT INTO canonical_subjects (code, name, levels, department, subject_type) VALUES
-- PREP (Level 0)
('PREP_LITERACY', 'Literacy / Early English', ARRAY[0], NULL, 'CORE'),
('PREP_NUMERACY', 'Numeracy / Early Mathematics', ARRAY[0], NULL, 'CORE'),
('PREP_PHONICS', 'Phonics', ARRAY[0], NULL, 'CORE'),
('PREP_PREWRITING', 'Pre-Writing Skills', ARRAY[0], NULL, 'CORE'),
('PREP_COMMS', 'Communication Skills', ARRAY[0], NULL, 'CORE'),
('PREP_SCIENCE', 'Basic Science / Discovery', ARRAY[0], NULL, 'CORE'),
('PREP_SOCHABITS', 'Social Habits', ARRAY[0], NULL, 'CORE'),
('PREP_HEALTHHABITS', 'Health Habits', ARRAY[0], NULL, 'CORE'),
('PREP_MORAL', 'Moral Instruction', ARRAY[0], NULL, 'CORE'),
('PREP_RELIGION', 'Religious Studies', ARRAY[0], NULL, 'CORE'),
('PREP_ARTS', 'Creative Arts', ARRAY[0], NULL, 'CORE'),
('PREP_MUSIC', 'Music', ARRAY[0], NULL, 'CORE'),
('PREP_RHYMES', 'Rhymes', ARRAY[0], NULL, 'CORE'),
('PREP_PHYS', 'Physical Development', ARRAY[0], NULL, 'CORE'),
('PREP_FINE', 'Fine Motor Skills', ARRAY[0], NULL, 'CORE'),
('PREP_PRACTICAL', 'Practical Life Skills', ARRAY[0], NULL, 'CORE'),
('PREP_ENV', 'Environmental Awareness', ARRAY[0], NULL, 'CORE'),
('PREP_COMPUTER', 'Computer / Digital Awareness', ARRAY[0], NULL, 'CORE'),

-- KG (Level 1)
('KG_ENGLISH', 'English Studies', ARRAY[1], NULL, 'CORE'),
('KG_MATH', 'Mathematics', ARRAY[1], NULL, 'CORE'),
('KG_PHONICS', 'Phonics', ARRAY[1], NULL, 'CORE'),
('KG_READING', 'Reading', ARRAY[1], NULL, 'CORE'),
('KG_WRITING', 'Writing', ARRAY[1], NULL, 'CORE'),
('KG_SCIENCE', 'Basic Science', ARRAY[1], NULL, 'CORE'),
('KG_SOCHABITS', 'Social Habits', ARRAY[1], NULL, 'CORE'),
('KG_MORAL', 'Civic / Moral Education', ARRAY[1], NULL, 'CORE'),
('KG_RELIGION', 'Religious Studies', ARRAY[1], NULL, 'CORE'),
('KG_ARTS', 'Cultural and Creative Arts', ARRAY[1], NULL, 'CORE'),
('KG_MUSIC', 'Music', ARRAY[1], NULL, 'CORE'),
('KG_RHYMES', 'Rhymes', ARRAY[1], NULL, 'CORE'),
('KG_PE', 'Physical and Health Education', ARRAY[1], NULL, 'CORE'),
('KG_COMPUTER', 'Computer / Digital Literacy', ARRAY[1], NULL, 'CORE'),
('KG_PRACTICAL', 'Home / Practical Life Skills', ARRAY[1], NULL, 'CORE'),
('KG_ENV', 'Environmental Studies', ARRAY[1], NULL, 'CORE'),
('KG_HANDWRITING', 'Handwriting', ARRAY[1], NULL, 'CORE'),
('KG_VERBAL', 'Verbal Reasoning', ARRAY[1], NULL, 'CORE'),
('KG_QUANT', 'Quantitative Reasoning', ARRAY[1], NULL, 'CORE'),

-- NURSERY (Level 2)
('NURSERY_ENGLISH', 'English Studies', ARRAY[2], NULL, 'CORE'),
('NURSERY_MATH', 'Mathematics', ARRAY[2], NULL, 'CORE'),
('NURSERY_PHONICS', 'Phonics', ARRAY[2], NULL, 'CORE'),
('NURSERY_READING', 'Reading', ARRAY[2], NULL, 'CORE'),
('NURSERY_WRITING', 'Writing', ARRAY[2], NULL, 'CORE'),
('NURSERY_SCIENCE', 'Basic Science', ARRAY[2], NULL, 'CORE'),
('NURSERY_SOCHABITS', 'Social Habits', ARRAY[2], NULL, 'CORE'),
('NURSERY_MORAL', 'Civic / Moral Education', ARRAY[2], NULL, 'CORE'),
('NURSERY_RELIGION', 'Religious Studies', ARRAY[2], NULL, 'CORE'),
('NURSERY_ARTS', 'Cultural and Creative Arts', ARRAY[2], NULL, 'CORE'),
('NURSERY_MUSIC', 'Music', ARRAY[2], NULL, 'CORE'),
('NURSERY_RHYMES', 'Rhymes', ARRAY[2], NULL, 'CORE'),
('NURSERY_PE', 'Physical and Health Education', ARRAY[2], NULL, 'CORE'),
('NURSERY_COMPUTER', 'Computer / Digital Literacy', ARRAY[2], NULL, 'CORE'),
('NURSERY_PRACTICAL', 'Home / Practical Life Skills', ARRAY[2], NULL, 'CORE'),
('NURSERY_ENV', 'Environmental Studies', ARRAY[2], NULL, 'CORE'),
('NURSERY_HANDWRITING', 'Handwriting', ARRAY[2], NULL, 'CORE'),
('NURSERY_VERBAL', 'Verbal Reasoning', ARRAY[2], NULL, 'CORE'),
('NURSERY_QUANT', 'Quantitative Reasoning', ARRAY[2], NULL, 'CORE'),

-- PRIMARY 1-3 (Level 3)
('PRI13_ENGLISH', 'English Studies', ARRAY[3], NULL, 'CORE'),
('PRI13_MATH', 'Mathematics', ARRAY[3], NULL, 'CORE'),
('PRI13_NIGERIAN', 'Nigerian Language', ARRAY[3], NULL, 'CORE'),
('PRI13_SCIENCE', 'Basic Science', ARRAY[3], NULL, 'CORE'),
('PRI13_PE', 'Physical and Health Education', ARRAY[3], NULL, 'CORE'),
('PRI13_CRS', 'Christian Religious Studies', ARRAY[3], NULL, 'CORE'),
('PRI13_ISLAMIC', 'Islamic Studies', ARRAY[3], NULL, 'CORE'),
('PRI13_HISTORY', 'Nigerian History', ARRAY[3], NULL, 'CORE'),
('PRI13_SOCIAL', 'Social and Citizenship Studies', ARRAY[3], NULL, 'CORE'),
('PRI13_ARTS', 'Cultural and Creative Arts', ARRAY[3], NULL, 'CORE'),
('PRI13_ARABIC', 'Arabic', ARRAY[3], NULL, 'ELECTIVE'),

-- PRIMARY 4-6 (Level 4)
('PRI46_ENGLISH', 'English Studies', ARRAY[4], NULL, 'CORE'),
('PRI46_MATH', 'Mathematics', ARRAY[4], NULL, 'CORE'),
('PRI46_NIGERIAN', 'Nigerian Language', ARRAY[4], NULL, 'CORE'),
('PRI46_SCIENCE', 'Basic Science and Technology', ARRAY[4], NULL, 'CORE'),
('PRI46_PE', 'Physical and Health Education', ARRAY[4], NULL, 'CORE'),
('PRI46_DIGITAL', 'Basic Digital Literacy', ARRAY[4], NULL, 'CORE'),
('PRI46_CRS', 'Christian Religious Studies', ARRAY[4], NULL, 'CORE'),
('PRI46_ISLAMIC', 'Islamic Studies', ARRAY[4], NULL, 'CORE'),
('PRI46_HISTORY', 'Nigerian History', ARRAY[4], NULL, 'CORE'),
('PRI46_SOCIAL', 'Social and Citizenship Studies', ARRAY[4], NULL, 'CORE'),
('PRI46_ARTS', 'Cultural and Creative Arts', ARRAY[4], NULL, 'CORE'),
('PRI46_PREVOC', 'Pre-Vocational Studies', ARRAY[4], NULL, 'CORE'),
('PRI46_FRENCH', 'French', ARRAY[4], NULL, 'ELECTIVE'),
('PRI46_ARABIC', 'Arabic', ARRAY[4], NULL, 'ELECTIVE'),

-- JSS 1-3 (Level 5)
('JSS_ENGLISH', 'English Studies', ARRAY[5], NULL, 'CORE'),
('JSS_MATH', 'Mathematics', ARRAY[5], NULL, 'CORE'),
('JSS_NIGERIAN', 'Nigerian Language', ARRAY[5], NULL, 'CORE'),
('JSS_SCIENCE', 'Intermediate Science', ARRAY[5], NULL, 'CORE'),
('JSS_PE', 'Physical and Health Education', ARRAY[5], NULL, 'CORE'),
('JSS_DIGITAL', 'Digital Technologies', ARRAY[5], NULL, 'CORE'),
('JSS_CRS', 'Christian Religious Studies', ARRAY[5], NULL, 'CORE'),
('JSS_ISLAMIC', 'Islamic Studies', ARRAY[5], NULL, 'CORE'),
('JSS_HISTORY', 'Nigerian History', ARRAY[5], NULL, 'CORE'),
('JSS_SOCIAL', 'Social and Citizenship Studies', ARRAY[5], NULL, 'CORE'),
('JSS_ARTS', 'Cultural and Creative Arts', ARRAY[5], NULL, 'CORE'),
('JSS_BUSINESS', 'Business Studies', ARRAY[5], NULL, 'CORE'),
('JSS_TRADE_SOLAR', 'Solar Photovoltaic Installation', ARRAY[5], NULL, 'VOCATIONAL'),
('JSS_TRADE_FASHION', 'Fashion Design and Garment Making', ARRAY[5], NULL, 'VOCATIONAL'),
('JSS_TRADE_LIVESTOCK', 'Livestock Farming', ARRAY[5], NULL, 'VOCATIONAL'),
('JSS_TRADE_BEAUTY', 'Beauty and Cosmetology', ARRAY[5], NULL, 'VOCATIONAL'),
('JSS_TRADE_HARDWARE', 'Computer Hardware Repairs', ARRAY[5], NULL, 'VOCATIONAL'),
('JSS_TRADE_HORTICULTURE', 'Horticulture and Crop Production', ARRAY[5], NULL, 'VOCATIONAL'),
('JSS_FRENCH', 'French', ARRAY[5], NULL, 'ELECTIVE'),
('JSS_ARABIC', 'Arabic', ARRAY[5], NULL, 'ELECTIVE'),

-- SS CORE (Levels 6-8)
('SS_ENGLISH', 'English Language', ARRAY[6,7,8], NULL, 'CORE'),
('SS_MATH', 'General Mathematics', ARRAY[6,7,8], NULL, 'CORE'),
('SS_CITIZEN', 'Citizenship and Heritage Studies', ARRAY[6,7,8], NULL, 'CORE'),
('SS_DIGITAL', 'Digital Technologies', ARRAY[6,7,8], NULL, 'CORE'),

-- SS SCIENCE (Levels 6-8)
('SS_BIOLOGY', 'Biology', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_CHEMISTRY', 'Chemistry', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_PHYSICS', 'Physics', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_AGRIC', 'Agricultural Science', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_FURTHER_MATH', 'Further Mathematics', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_TECH_DRAWING', 'Technical Drawing', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_FOODS', 'Foods and Nutrition', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_GEOGRAPHY', 'Geography', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_PE_SCIENCE', 'Physical Education', ARRAY[6,7,8], 'SCIENCE', 'CORE'),
('SS_HEALTH', 'Health Education', ARRAY[6,7,8], 'SCIENCE', 'CORE'),

-- SS HUMANITIES (Levels 6-8)
('SS_HISTORY', 'Nigerian History', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_GOVERNMENT', 'Government', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_CRS', 'Christian Religious Studies', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_ISLAMIC', 'Islamic Studies', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_NIGERIAN_HUM', 'Nigerian Language', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_FRENCH', 'French', ARRAY[6,7,8], 'HUMANITIES', 'ELECTIVE'),
('SS_ARABIC', 'Arabic', ARRAY[6,7,8], 'HUMANITIES', 'ELECTIVE'),
('SS_VISUAL_ARTS', 'Visual Arts', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_MUSIC', 'Music', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_LITERATURE', 'Literature in English', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_HOME_MGMT', 'Home Management', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),
('SS_CATERING', 'Catering Craft', ARRAY[6,7,8], 'HUMANITIES', 'CORE'),

-- SS BUSINESS (Levels 6-8)
('SS_ACCOUNTING', 'Accounting', ARRAY[6,7,8], 'BUSINESS', 'CORE'),
('SS_COMMERCE', 'Commerce', ARRAY[6,7,8], 'BUSINESS', 'CORE'),
('SS_MARKETING', 'Marketing', ARRAY[6,7,8], 'BUSINESS', 'CORE'),
('SS_ECONOMICS', 'Economics', ARRAY[6,7,8], 'BUSINESS', 'CORE'),

-- SS TRADE (Levels 6-8)
('SS_TRADE_SOLAR', 'Solar Photovoltaic Installation', ARRAY[6,7,8], 'TRADE', 'VOCATIONAL'),
('SS_TRADE_FASHION', 'Fashion Design and Garment Making', ARRAY[6,7,8], 'TRADE', 'VOCATIONAL'),
('SS_TRADE_LIVESTOCK', 'Livestock Farming', ARRAY[6,7,8], 'TRADE', 'VOCATIONAL'),
('SS_TRADE_BEAUTY', 'Beauty and Cosmetology', ARRAY[6,7,8], 'TRADE', 'VOCATIONAL'),
('SS_TRADE_HARDWARE', 'Computer Hardware Repairs', ARRAY[6,7,8], 'TRADE', 'VOCATIONAL'),
('SS_TRADE_HORTICULTURE', 'Horticulture and Crop Production', ARRAY[6,7,8], 'TRADE', 'VOCATIONAL');

-- ============================================================================
-- STEP 2: LINK CANONICAL SUBJECTS TO ALL EXISTING SCHOOLS
-- ============================================================================

DO $$
DECLARE
  v_school_id UUID;
  v_subject_record RECORD;
  v_school_count INT := 0;
  v_inserted_count INT := 0;
BEGIN
  RAISE NOTICE '========== STEP 2: Linking subjects to all schools ==========';
  
  FOR v_school_id IN SELECT id FROM schools
  LOOP
    v_school_count := v_school_count + 1;
    
    FOR v_subject_record IN SELECT * FROM canonical_subjects
    LOOP
      -- Check if subject already exists for this school
      IF NOT EXISTS (
        SELECT 1 FROM subjects 
        WHERE school_id = v_school_id 
        AND code = v_subject_record.code
      ) THEN
        INSERT INTO subjects (school_id, name, code, applicable_to_levels, is_active, department, subject_type)
        VALUES (v_school_id, v_subject_record.name, v_subject_record.code, v_subject_record.levels, TRUE, v_subject_record.department, v_subject_record.subject_type);
        
        v_inserted_count := v_inserted_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ STEP 2: Processed % schools, inserted % new subjects', v_school_count, v_inserted_count;
END $$;

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

SELECT 
  COUNT(DISTINCT school_id) as schools_with_subjects,
  COUNT(*) as total_subject_links,
  COUNT(DISTINCT code) as unique_subjects
FROM subjects
WHERE is_active = TRUE;

COMMIT;
