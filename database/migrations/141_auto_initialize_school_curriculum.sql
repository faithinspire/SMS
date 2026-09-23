-- Migration 141: Auto-Initialize Curriculum for New Schools
-- Purpose: When a new school is created, automatically populate complete curriculum
-- This is triggered AFTER the school INSERT completes

BEGIN;

-- ============================================================================
-- Helper Function: Initialize School Curriculum
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_school_curriculum(p_school_id UUID)
RETURNS VOID AS $$
BEGIN
  
  -- ========================================================================
  -- PREP SUBJECTS (18 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, created_at)
  VALUES 
    (p_school_id, 'Literacy / Early English', 'PREP-ENG', 0, NOW()),
    (p_school_id, 'Numeracy / Early Mathematics', 'PREP-MATH', 0, NOW()),
    (p_school_id, 'Phonics', 'PREP-PHONICS', 0, NOW()),
    (p_school_id, 'Pre-Writing Skills', 'PREP-PRE-WRITE', 0, NOW()),
    (p_school_id, 'Communication Skills', 'PREP-COMM', 0, NOW()),
    (p_school_id, 'Basic Science / Discovery', 'PREP-SCI', 0, NOW()),
    (p_school_id, 'Social Habits', 'PREP-SOC-HABITS', 0, NOW()),
    (p_school_id, 'Health Habits', 'PREP-HEALTH', 0, NOW()),
    (p_school_id, 'Moral Instruction', 'PREP-MORAL', 0, NOW()),
    (p_school_id, 'Religious Studies', 'PREP-REL', 0, NOW()),
    (p_school_id, 'Creative Arts', 'PREP-ARTS', 0, NOW()),
    (p_school_id, 'Music', 'PREP-MUSIC', 0, NOW()),
    (p_school_id, 'Rhymes', 'PREP-RHYMES', 0, NOW()),
    (p_school_id, 'Physical Development', 'PREP-PHYS-DEV', 0, NOW()),
    (p_school_id, 'Fine Motor Skills', 'PREP-MOTOR', 0, NOW()),
    (p_school_id, 'Practical Life Skills', 'PREP-PRACTICAL', 0, NOW()),
    (p_school_id, 'Environmental Awareness', 'PREP-ENV', 0, NOW()),
    (p_school_id, 'Computer / Digital Awareness', 'PREP-DIGITAL', 0, NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- KG SUBJECTS (19 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, created_at)
  VALUES
    (p_school_id, 'English Studies', 'KG-ENG', 1, NOW()),
    (p_school_id, 'Mathematics', 'KG-MATH', 1, NOW()),
    (p_school_id, 'Phonics', 'KG-PHONICS', 1, NOW()),
    (p_school_id, 'Reading', 'KG-READ', 1, NOW()),
    (p_school_id, 'Writing', 'KG-WRITE', 1, NOW()),
    (p_school_id, 'Basic Science', 'KG-SCI', 1, NOW()),
    (p_school_id, 'Social Habits', 'KG-SOC-HABITS', 1, NOW()),
    (p_school_id, 'Civic / Moral Education', 'KG-CIVIC', 1, NOW()),
    (p_school_id, 'Religious Studies', 'KG-REL', 1, NOW()),
    (p_school_id, 'Cultural and Creative Arts', 'KG-CCA', 1, NOW()),
    (p_school_id, 'Music', 'KG-MUSIC', 1, NOW()),
    (p_school_id, 'Rhymes', 'KG-RHYMES', 1, NOW()),
    (p_school_id, 'Physical and Health Education', 'KG-PHE', 1, NOW()),
    (p_school_id, 'Computer / Digital Literacy', 'KG-DIGITAL', 1, NOW()),
    (p_school_id, 'Home / Practical Life Skills', 'KG-PRACTICAL', 1, NOW()),
    (p_school_id, 'Environmental Studies', 'KG-ENV', 1, NOW()),
    (p_school_id, 'Handwriting', 'KG-HANDWRITE', 1, NOW()),
    (p_school_id, 'Verbal Reasoning', 'KG-VERBAL', 1, NOW()),
    (p_school_id, 'Quantitative Reasoning', 'KG-QUANT', 1, NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- NURSERY SUBJECTS (19 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, created_at)
  VALUES
    (p_school_id, 'English Studies', 'NUR-ENG', 1, NOW()),
    (p_school_id, 'Mathematics', 'NUR-MATH', 1, NOW()),
    (p_school_id, 'Phonics', 'NUR-PHONICS', 1, NOW()),
    (p_school_id, 'Reading', 'NUR-READ', 1, NOW()),
    (p_school_id, 'Writing', 'NUR-WRITE', 1, NOW()),
    (p_school_id, 'Basic Science', 'NUR-SCI', 1, NOW()),
    (p_school_id, 'Social Habits', 'NUR-SOC-HABITS', 1, NOW()),
    (p_school_id, 'Civic / Moral Education', 'NUR-CIVIC', 1, NOW()),
    (p_school_id, 'Religious Studies', 'NUR-REL', 1, NOW()),
    (p_school_id, 'Cultural and Creative Arts', 'NUR-CCA', 1, NOW()),
    (p_school_id, 'Music', 'NUR-MUSIC', 1, NOW()),
    (p_school_id, 'Rhymes', 'NUR-RHYMES', 1, NOW()),
    (p_school_id, 'Physical and Health Education', 'NUR-PHE', 1, NOW()),
    (p_school_id, 'Computer / Digital Literacy', 'NUR-DIGITAL', 1, NOW()),
    (p_school_id, 'Home / Practical Life Skills', 'NUR-PRACTICAL', 1, NOW()),
    (p_school_id, 'Environmental Studies', 'NUR-ENV', 1, NOW()),
    (p_school_id, 'Handwriting', 'NUR-HANDWRITE', 1, NOW()),
    (p_school_id, 'Verbal Reasoning', 'NUR-VERBAL', 1, NOW()),
    (p_school_id, 'Quantitative Reasoning', 'NUR-QUANT', 1, NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- PRIMARY 1–3 SUBJECTS (13 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, created_at)
  VALUES
    (p_school_id, 'English Studies', 'PRI-ENG', 2, NOW()),
    (p_school_id, 'Mathematics', 'PRI-MATH', 2, NOW()),
    (p_school_id, 'Hausa', 'PRI-NLANG-HAUSA', 2, NOW()),
    (p_school_id, 'Igbo', 'PRI-NLANG-IGBO', 2, NOW()),
    (p_school_id, 'Yoruba', 'PRI-NLANG-YORUBA', 2, NOW()),
    (p_school_id, 'Basic Science', 'PRI-SCI', 2, NOW()),
    (p_school_id, 'Physical and Health Education', 'PRI-PHE', 2, NOW()),
    (p_school_id, 'Christian Religious Studies', 'PRI-CRS', 2, NOW()),
    (p_school_id, 'Islamic Studies', 'PRI-ISL', 2, NOW()),
    (p_school_id, 'Nigerian History', 'PRI-HIST', 2, NOW()),
    (p_school_id, 'Social and Citizenship Studies', 'PRI-SCS', 2, NOW()),
    (p_school_id, 'Cultural and Creative Arts', 'PRI-CCA', 2, NOW()),
    (p_school_id, 'Arabic', 'PRI-ARAB', 2, NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- PRIMARY 4–6 SUBJECTS (16 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, created_at)
  VALUES
    (p_school_id, 'English Studies', 'PRI46-ENG', 3, NOW()),
    (p_school_id, 'Mathematics', 'PRI46-MATH', 3, NOW()),
    (p_school_id, 'Hausa', 'PRI46-NLANG-HAUSA', 3, NOW()),
    (p_school_id, 'Igbo', 'PRI46-NLANG-IGBO', 3, NOW()),
    (p_school_id, 'Yoruba', 'PRI46-NLANG-YORUBA', 3, NOW()),
    (p_school_id, 'Basic Science and Technology', 'PRI46-BST', 3, NOW()),
    (p_school_id, 'Physical and Health Education', 'PRI46-PHE', 3, NOW()),
    (p_school_id, 'Basic Digital Literacy', 'PRI46-DIGITAL', 3, NOW()),
    (p_school_id, 'Christian Religious Studies', 'PRI46-CRS', 3, NOW()),
    (p_school_id, 'Islamic Studies', 'PRI46-ISL', 3, NOW()),
    (p_school_id, 'Nigerian History', 'PRI46-HIST', 3, NOW()),
    (p_school_id, 'Social and Citizenship Studies', 'PRI46-SCS', 3, NOW()),
    (p_school_id, 'Cultural and Creative Arts', 'PRI46-CCA', 3, NOW()),
    (p_school_id, 'Pre-Vocational Studies', 'PRI46-PRE-VOC', 3, NOW()),
    (p_school_id, 'French', 'PRI46-FRE', 3, NOW()),
    (p_school_id, 'Arabic', 'PRI46-ARAB', 3, NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- JSS1–3 SUBJECTS (22 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, created_at)
  VALUES
    (p_school_id, 'English Studies', 'JSS-ENG', 4, NOW()),
    (p_school_id, 'Mathematics', 'JSS-MATH', 4, NOW()),
    (p_school_id, 'Hausa', 'JSS-NLANG-HAUSA', 4, NOW()),
    (p_school_id, 'Igbo', 'JSS-NLANG-IGBO', 4, NOW()),
    (p_school_id, 'Yoruba', 'JSS-NLANG-YORUBA', 4, NOW()),
    (p_school_id, 'Intermediate Science', 'JSS-SCI', 4, NOW()),
    (p_school_id, 'Physical and Health Education', 'JSS-PHE', 4, NOW()),
    (p_school_id, 'Digital Technologies', 'JSS-DIGITAL', 4, NOW()),
    (p_school_id, 'Christian Religious Studies', 'JSS-CRS', 4, NOW()),
    (p_school_id, 'Islamic Studies', 'JSS-ISL', 4, NOW()),
    (p_school_id, 'Nigerian History', 'JSS-HIST', 4, NOW()),
    (p_school_id, 'Social and Citizenship Studies', 'JSS-SCS', 4, NOW()),
    (p_school_id, 'Cultural and Creative Arts', 'JSS-CCA', 4, NOW()),
    (p_school_id, 'Business Studies', 'JSS-BUS', 4, NOW()),
    (p_school_id, 'French', 'JSS-FRE', 4, NOW()),
    (p_school_id, 'Arabic', 'JSS-ARAB', 4, NOW()),
    (p_school_id, 'Solar Photovoltaic Installation and Maintenance', 'JSS-TRADE-SOLAR', 4, NOW()),
    (p_school_id, 'Fashion Design and Garment Making', 'JSS-TRADE-FASHION', 4, NOW()),
    (p_school_id, 'Livestock Farming', 'JSS-TRADE-LIVESTOCK', 4, NOW()),
    (p_school_id, 'Beauty and Cosmetology', 'JSS-TRADE-BEAUTY', 4, NOW()),
    (p_school_id, 'Computer Hardware and GSM Repairs', 'JSS-TRADE-HARDWARE', 4, NOW()),
    (p_school_id, 'Horticulture and Crop Production', 'JSS-TRADE-HORT', 4, NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- SS1–3 CORE SUBJECTS (4 core)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
  VALUES
    (p_school_id, 'English Language', 'SS-ENG', 5, 'CORE', NOW()),
    (p_school_id, 'General Mathematics', 'SS-MATH', 5, 'CORE', NOW()),
    (p_school_id, 'Citizenship and Heritage Studies', 'SS-CHS', 5, 'CORE', NOW()),
    (p_school_id, 'Digital Technologies', 'SS-DIGITAL', 5, 'CORE', NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- SS SCIENCE SUBJECTS (10 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
  VALUES
    (p_school_id, 'Biology', 'SS-BIO', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Chemistry', 'SS-CHEM', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Physics', 'SS-PHY', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Agricultural Science', 'SS-AGRIC', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Further Mathematics', 'SS-FMATH', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Physical Education', 'SS-PE', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Health Education', 'SS-HEALTH', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Foods and Nutrition', 'SS-FOODS', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Geography', 'SS-GEO', 5, 'SCIENCE', NOW()),
    (p_school_id, 'Technical Drawing', 'SS-TECH-DRAW', 5, 'SCIENCE', NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- SS HUMANITIES / ARTS SUBJECTS (14 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
  VALUES
    (p_school_id, 'Nigerian History', 'SS-HIST', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Government', 'SS-GOV', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Christian Religious Studies', 'SS-CRS', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Islamic Studies', 'SS-ISL', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Hausa', 'SS-NLANG-HAUSA', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Igbo', 'SS-NLANG-IGBO', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Yoruba', 'SS-NLANG-YORUBA', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'French', 'SS-FRE', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Arabic', 'SS-ARAB', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Visual Arts', 'SS-ARTS', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Music', 'SS-MUSIC', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Literature in English', 'SS-LIT', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Home Management', 'SS-HOME', 5, 'HUMANITIES', NOW()),
    (p_school_id, 'Catering Craft', 'SS-CATERING', 5, 'HUMANITIES', NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- SS BUSINESS SUBJECTS (4 subjects)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
  VALUES
    (p_school_id, 'Accounting', 'SS-ACCOUNTING', 5, 'BUSINESS', NOW()),
    (p_school_id, 'Commerce', 'SS-COMMERCE', 5, 'BUSINESS', NOW()),
    (p_school_id, 'Marketing', 'SS-MARKETING', 5, 'BUSINESS', NOW()),
    (p_school_id, 'Economics', 'SS-ECONOMICS', 5, 'BUSINESS', NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
  -- ========================================================================
  -- SS TRADE SUBJECTS (6 options)
  -- ========================================================================
  
  INSERT INTO subjects (school_id, name, subject_code, level, department, created_at)
  VALUES
    (p_school_id, 'Solar Photovoltaic Installation and Maintenance', 'SS-TRADE-SOLAR', 5, 'TRADE', NOW()),
    (p_school_id, 'Fashion Design and Garment Making', 'SS-TRADE-FASHION', 5, 'TRADE', NOW()),
    (p_school_id, 'Livestock Farming', 'SS-TRADE-LIVESTOCK', 5, 'TRADE', NOW()),
    (p_school_id, 'Beauty and Cosmetology', 'SS-TRADE-BEAUTY', 5, 'TRADE', NOW()),
    (p_school_id, 'Computer Hardware and GSM Repairs', 'SS-TRADE-HARDWARE', 5, 'TRADE', NOW()),
    (p_school_id, 'Horticulture and Crop Production', 'SS-TRADE-HORT', 5, 'TRADE', NOW())
  ON CONFLICT (school_id, subject_code) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-Initialize Curriculum When School is Created
-- ============================================================================

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS trigger_initialize_school_curriculum ON schools;

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_init_school_curriculum()
RETURNS TRIGGER AS $$
BEGIN
  -- Call curriculum initialization function
  PERFORM initialize_school_curriculum(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to schools table (fires AFTER INSERT)
CREATE TRIGGER trigger_initialize_school_curriculum
AFTER INSERT ON schools
FOR EACH ROW
EXECUTE FUNCTION trigger_init_school_curriculum();

COMMIT;
