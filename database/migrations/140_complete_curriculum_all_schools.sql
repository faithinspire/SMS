-- Migration 140: Complete Subject Curriculum for All Schools (Prep → SS3)
-- Purpose: Populate NERDC-aligned subjects for EVERY SCHOOL across all education levels
-- This migration is idempotent and safe to run multiple times
-- Respects school_id as NOT NULL constraint

BEGIN;

-- ============================================================================
-- HELPER: Ensure all required columns exist
-- ============================================================================
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_code VARCHAR(100);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS level INT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Drop old constraint if exists, create unique constraint on subject_code
DO $$
BEGIN
  -- Try to drop old constraint
  BEGIN
    ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_school_id_name_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  -- Create new unique constraint on school_id + subject_code
  BEGIN
    ALTER TABLE subjects ADD UNIQUE (school_id, subject_code);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- ============================================================================
-- MAIN LOGIC: For each school, populate the complete curriculum
-- ============================================================================

-- Get all existing schools and populate their curriculum
DO $$
DECLARE
  v_school RECORD;
  v_subject_id UUID;
BEGIN
  
  -- Loop through every school in the database
  FOR v_school IN SELECT id FROM schools LOOP
    
    -- ========================================================================
    -- PREP SUBJECTS (18 subjects)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, created_at)
    VALUES 
      (v_school.id, 'Literacy / Early English', 'PREP-ENG', 0, NOW()),
      (v_school.id, 'Numeracy / Early Mathematics', 'PREP-MATH', 0, NOW()),
      (v_school.id, 'Phonics', 'PREP-PHONICS', 0, NOW()),
      (v_school.id, 'Pre-Writing Skills', 'PREP-PRE-WRITE', 0, NOW()),
      (v_school.id, 'Communication Skills', 'PREP-COMM', 0, NOW()),
      (v_school.id, 'Basic Science / Discovery', 'PREP-SCI', 0, NOW()),
      (v_school.id, 'Social Habits', 'PREP-SOC-HABITS', 0, NOW()),
      (v_school.id, 'Health Habits', 'PREP-HEALTH', 0, NOW()),
      (v_school.id, 'Moral Instruction', 'PREP-MORAL', 0, NOW()),
      (v_school.id, 'Religious Studies', 'PREP-REL', 0, NOW()),
      (v_school.id, 'Creative Arts', 'PREP-ARTS', 0, NOW()),
      (v_school.id, 'Music', 'PREP-MUSIC', 0, NOW()),
      (v_school.id, 'Rhymes', 'PREP-RHYMES', 0, NOW()),
      (v_school.id, 'Physical Development', 'PREP-PHYS-DEV', 0, NOW()),
      (v_school.id, 'Fine Motor Skills', 'PREP-MOTOR', 0, NOW()),
      (v_school.id, 'Practical Life Skills', 'PREP-PRACTICAL', 0, NOW()),
      (v_school.id, 'Environmental Awareness', 'PREP-ENV', 0, NOW()),
      (v_school.id, 'Computer / Digital Awareness', 'PREP-DIGITAL', 0, NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- KG SUBJECTS (19 subjects)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, created_at)
    VALUES
      (v_school.id, 'English Studies', 'KG-ENG', 1, NOW()),
      (v_school.id, 'Mathematics', 'KG-MATH', 1, NOW()),
      (v_school.id, 'Phonics', 'KG-PHONICS', 1, NOW()),
      (v_school.id, 'Reading', 'KG-READ', 1, NOW()),
      (v_school.id, 'Writing', 'KG-WRITE', 1, NOW()),
      (v_school.id, 'Basic Science', 'KG-SCI', 1, NOW()),
      (v_school.id, 'Social Habits', 'KG-SOC-HABITS', 1, NOW()),
      (v_school.id, 'Civic / Moral Education', 'KG-CIVIC', 1, NOW()),
      (v_school.id, 'Religious Studies', 'KG-REL', 1, NOW()),
      (v_school.id, 'Cultural and Creative Arts', 'KG-CCA', 1, NOW()),
      (v_school.id, 'Music', 'KG-MUSIC', 1, NOW()),
      (v_school.id, 'Rhymes', 'KG-RHYMES', 1, NOW()),
      (v_school.id, 'Physical and Health Education', 'KG-PHE', 1, NOW()),
      (v_school.id, 'Computer / Digital Literacy', 'KG-DIGITAL', 1, NOW()),
      (v_school.id, 'Home / Practical Life Skills', 'KG-PRACTICAL', 1, NOW()),
      (v_school.id, 'Environmental Studies', 'KG-ENV', 1, NOW()),
      (v_school.id, 'Handwriting', 'KG-HANDWRITE', 1, NOW()),
      (v_school.id, 'Verbal Reasoning', 'KG-VERBAL', 1, NOW()),
      (v_school.id, 'Quantitative Reasoning', 'KG-QUANT', 1, NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- NURSERY SUBJECTS (19 subjects)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, created_at)
    VALUES
      (v_school.id, 'English Studies', 'NUR-ENG', 1, NOW()),
      (v_school.id, 'Mathematics', 'NUR-MATH', 1, NOW()),
      (v_school.id, 'Phonics', 'NUR-PHONICS', 1, NOW()),
      (v_school.id, 'Reading', 'NUR-READ', 1, NOW()),
      (v_school.id, 'Writing', 'NUR-WRITE', 1, NOW()),
      (v_school.id, 'Basic Science', 'NUR-SCI', 1, NOW()),
      (v_school.id, 'Social Habits', 'NUR-SOC-HABITS', 1, NOW()),
      (v_school.id, 'Civic / Moral Education', 'NUR-CIVIC', 1, NOW()),
      (v_school.id, 'Religious Studies', 'NUR-REL', 1, NOW()),
      (v_school.id, 'Cultural and Creative Arts', 'NUR-CCA', 1, NOW()),
      (v_school.id, 'Music', 'NUR-MUSIC', 1, NOW()),
      (v_school.id, 'Rhymes', 'NUR-RHYMES', 1, NOW()),
      (v_school.id, 'Physical and Health Education', 'NUR-PHE', 1, NOW()),
      (v_school.id, 'Computer / Digital Literacy', 'NUR-DIGITAL', 1, NOW()),
      (v_school.id, 'Home / Practical Life Skills', 'NUR-PRACTICAL', 1, NOW()),
      (v_school.id, 'Environmental Studies', 'NUR-ENV', 1, NOW()),
      (v_school.id, 'Handwriting', 'NUR-HANDWRITE', 1, NOW()),
      (v_school.id, 'Verbal Reasoning', 'NUR-VERBAL', 1, NOW()),
      (v_school.id, 'Quantitative Reasoning', 'NUR-QUANT', 1, NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- PRIMARY 1–3 SUBJECTS (11 subjects + language variants)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, created_at)
    VALUES
      (v_school.id, 'English Studies', 'PRI-ENG', 2, NOW()),
      (v_school.id, 'Mathematics', 'PRI-MATH', 2, NOW()),
      (v_school.id, 'Hausa', 'PRI-NLANG-HAUSA', 2, NOW()),
      (v_school.id, 'Igbo', 'PRI-NLANG-IGBO', 2, NOW()),
      (v_school.id, 'Yoruba', 'PRI-NLANG-YORUBA', 2, NOW()),
      (v_school.id, 'Basic Science', 'PRI-SCI', 2, NOW()),
      (v_school.id, 'Physical and Health Education', 'PRI-PHE', 2, NOW()),
      (v_school.id, 'Christian Religious Studies', 'PRI-CRS', 2, NOW()),
      (v_school.id, 'Islamic Studies', 'PRI-ISL', 2, NOW()),
      (v_school.id, 'Nigerian History', 'PRI-HIST', 2, NOW()),
      (v_school.id, 'Social and Citizenship Studies', 'PRI-SCS', 2, NOW()),
      (v_school.id, 'Cultural and Creative Arts', 'PRI-CCA', 2, NOW()),
      (v_school.id, 'Arabic', 'PRI-ARAB', 2, NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- PRIMARY 4–6 SUBJECTS (14 subjects + language variants)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, created_at)
    VALUES
      (v_school.id, 'English Studies', 'PRI46-ENG', 3, NOW()),
      (v_school.id, 'Mathematics', 'PRI46-MATH', 3, NOW()),
      (v_school.id, 'Hausa', 'PRI46-NLANG-HAUSA', 3, NOW()),
      (v_school.id, 'Igbo', 'PRI46-NLANG-IGBO', 3, NOW()),
      (v_school.id, 'Yoruba', 'PRI46-NLANG-YORUBA', 3, NOW()),
      (v_school.id, 'Basic Science and Technology', 'PRI46-BST', 3, NOW()),
      (v_school.id, 'Physical and Health Education', 'PRI46-PHE', 3, NOW()),
      (v_school.id, 'Basic Digital Literacy', 'PRI46-DIGITAL', 3, NOW()),
      (v_school.id, 'Christian Religious Studies', 'PRI46-CRS', 3, NOW()),
      (v_school.id, 'Islamic Studies', 'PRI46-ISL', 3, NOW()),
      (v_school.id, 'Nigerian History', 'PRI46-HIST', 3, NOW()),
      (v_school.id, 'Social and Citizenship Studies', 'PRI46-SCS', 3, NOW()),
      (v_school.id, 'Cultural and Creative Arts', 'PRI46-CCA', 3, NOW()),
      (v_school.id, 'Pre-Vocational Studies', 'PRI46-PRE-VOC', 3, NOW()),
      (v_school.id, 'French', 'PRI46-FRE', 3, NOW()),
      (v_school.id, 'Arabic', 'PRI46-ARAB', 3, NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- JSS1–3 SUBJECTS (15 subjects + language & trade variants)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, created_at)
    VALUES
      (v_school.id, 'English Studies', 'JSS-ENG', 4, NOW()),
      (v_school.id, 'Mathematics', 'JSS-MATH', 4, NOW()),
      (v_school.id, 'Hausa', 'JSS-NLANG-HAUSA', 4, NOW()),
      (v_school.id, 'Igbo', 'JSS-NLANG-IGBO', 4, NOW()),
      (v_school.id, 'Yoruba', 'JSS-NLANG-YORUBA', 4, NOW()),
      (v_school.id, 'Intermediate Science', 'JSS-SCI', 4, NOW()),
      (v_school.id, 'Physical and Health Education', 'JSS-PHE', 4, NOW()),
      (v_school.id, 'Digital Technologies', 'JSS-DIGITAL', 4, NOW()),
      (v_school.id, 'Christian Religious Studies', 'JSS-CRS', 4, NOW()),
      (v_school.id, 'Islamic Studies', 'JSS-ISL', 4, NOW()),
      (v_school.id, 'Nigerian History', 'JSS-HIST', 4, NOW()),
      (v_school.id, 'Social and Citizenship Studies', 'JSS-SCS', 4, NOW()),
      (v_school.id, 'Cultural and Creative Arts', 'JSS-CCA', 4, NOW()),
      (v_school.id, 'Business Studies', 'JSS-BUS', 4, NOW()),
      (v_school.id, 'French', 'JSS-FRE', 4, NOW()),
      (v_school.id, 'Arabic', 'JSS-ARAB', 4, NOW()),
      -- JSS Trade Subjects
      (v_school.id, 'Solar Photovoltaic Installation and Maintenance', 'JSS-TRADE-SOLAR', 4, NOW()),
      (v_school.id, 'Fashion Design and Garment Making', 'JSS-TRADE-FASHION', 4, NOW()),
      (v_school.id, 'Livestock Farming', 'JSS-TRADE-LIVESTOCK', 4, NOW()),
      (v_school.id, 'Beauty and Cosmetology', 'JSS-TRADE-BEAUTY', 4, NOW()),
      (v_school.id, 'Computer Hardware and GSM Repairs', 'JSS-TRADE-HARDWARE', 4, NOW()),
      (v_school.id, 'Horticulture and Crop Production', 'JSS-TRADE-HORT', 4, NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- SS1–3 CORE SUBJECTS (5 core subjects)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
    VALUES
      (v_school.id, 'English Language', 'SS-ENG', 5, 'CORE', NOW()),
      (v_school.id, 'General Mathematics', 'SS-MATH', 5, 'CORE', NOW()),
      (v_school.id, 'Citizenship and Heritage Studies', 'SS-CHS', 5, 'CORE', NOW()),
      (v_school.id, 'Digital Technologies', 'SS-DIGITAL', 5, 'CORE', NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- SS SCIENCE SUBJECTS (10 subjects)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
    VALUES
      (v_school.id, 'Biology', 'SS-BIO', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Chemistry', 'SS-CHEM', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Physics', 'SS-PHY', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Agricultural Science', 'SS-AGRIC', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Further Mathematics', 'SS-FMATH', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Physical Education', 'SS-PE', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Health Education', 'SS-HEALTH', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Foods and Nutrition', 'SS-FOODS', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Geography', 'SS-GEO', 5, 'SCIENCE', NOW()),
      (v_school.id, 'Technical Drawing', 'SS-TECH-DRAW', 5, 'SCIENCE', NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- SS HUMANITIES / ARTS SUBJECTS (12 subjects + language variants)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
    VALUES
      (v_school.id, 'Nigerian History', 'SS-HIST', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Government', 'SS-GOV', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Christian Religious Studies', 'SS-CRS', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Islamic Studies', 'SS-ISL', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Hausa', 'SS-NLANG-HAUSA', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Igbo', 'SS-NLANG-IGBO', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Yoruba', 'SS-NLANG-YORUBA', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'French', 'SS-FRE', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Arabic', 'SS-ARAB', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Visual Arts', 'SS-ARTS', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Music', 'SS-MUSIC', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Literature in English', 'SS-LIT', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Home Management', 'SS-HOME', 5, 'HUMANITIES', NOW()),
      (v_school.id, 'Catering Craft', 'SS-CATERING', 5, 'HUMANITIES', NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- SS BUSINESS SUBJECTS (4 subjects)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
    VALUES
      (v_school.id, 'Accounting', 'SS-ACCOUNTING', 5, 'BUSINESS', NOW()),
      (v_school.id, 'Commerce', 'SS-COMMERCE', 5, 'BUSINESS', NOW()),
      (v_school.id, 'Marketing', 'SS-MARKETING', 5, 'BUSINESS', NOW()),
      (v_school.id, 'Economics', 'SS-ECONOMICS', 5, 'BUSINESS', NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
    -- ========================================================================
    -- SS TRADE SUBJECTS (6 options)
    -- ========================================================================
    
    INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
    VALUES
      (v_school.id, 'Solar Photovoltaic Installation and Maintenance', 'SS-TRADE-SOLAR', 5, 'TRADE', NOW()),
      (v_school.id, 'Fashion Design and Garment Making', 'SS-TRADE-FASHION', 5, 'TRADE', NOW()),
      (v_school.id, 'Livestock Farming', 'SS-TRADE-LIVESTOCK', 5, 'TRADE', NOW()),
      (v_school.id, 'Beauty and Cosmetology', 'SS-TRADE-BEAUTY', 5, 'TRADE', NOW()),
      (v_school.id, 'Computer Hardware and GSM Repairs', 'SS-TRADE-HARDWARE', 5, 'TRADE', NOW()),
      (v_school.id, 'Horticulture and Crop Production', 'SS-TRADE-HORT', 5, 'TRADE', NOW())
    ON CONFLICT (school_id, subject_code) DO NOTHING;
    
  END LOOP;
  
  RAISE NOTICE 'Migration 140: Curriculum population complete for all schools';
  
END $$;

COMMIT;
