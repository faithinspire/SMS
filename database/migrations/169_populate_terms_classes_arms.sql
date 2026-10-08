-- Migration 169: Populate Terms, Classes, and Arms for all schools and sessions
-- Fixes academic_terms to include start_date and end_date

BEGIN;

-- Step 1: Populate academic_terms for each school and session with proper dates
DO $$ 
DECLARE
  school_rec RECORD;
  session_rec RECORD;
  term_num INT;
  term_names TEXT[] := ARRAY['First Term', 'Second Term', 'Third Term'];
  term_start_month INT;
  term_end_month INT;
  session_start_year INT;
BEGIN
  FOR school_rec IN SELECT id FROM schools WHERE status = 'ACTIVE' LOOP
    FOR session_rec IN SELECT id, start_year FROM academic_sessions WHERE school_id = school_rec.id ORDER BY start_year LOOP
      session_start_year := session_rec.start_year;
      
      FOR term_num IN 1..3 LOOP
        -- Calculate month ranges for each term
        -- Term 1: Sept-Dec, Term 2: Jan-Mar, Term 3: Apr-Jun
        CASE term_num
          WHEN 1 THEN
            term_start_month := 9;
            term_end_month := 12;
          WHEN 2 THEN
            term_start_month := 1;
            term_end_month := 3;
          WHEN 3 THEN
            term_start_month := 4;
            term_end_month := 6;
        END CASE;

        -- Insert term with proper dates
        INSERT INTO academic_terms (
          school_id,
          session_id,
          name,
          term_number,
          start_date,
          end_date,
          is_active
        ) VALUES (
          school_rec.id,
          session_rec.id,
          term_names[term_num],
          term_num,
          MAKE_DATE(
            CASE WHEN term_num = 2 THEN session_start_year + 1 ELSE session_start_year END,
            term_start_month,
            1
          ),
          MAKE_DATE(
            CASE WHEN term_num = 2 THEN session_start_year + 1 ELSE session_start_year END,
            term_end_month,
            28
          ),
          FALSE
        ) ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Populated terms for all schools and sessions';
END $$;

-- Step 2: Ensure classes exist for each school (if not already present)
DO $$ 
DECLARE
  school_rec RECORD;
  class_num INT;
  class_names TEXT[] := ARRAY['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];
BEGIN
  FOR school_rec IN SELECT id FROM schools WHERE status = 'ACTIVE' LOOP
    -- Check if school already has classes
    IF NOT EXISTS (SELECT 1 FROM classes WHERE school_id = school_rec.id LIMIT 1) THEN
      FOR class_num IN 1..12 LOOP
        INSERT INTO classes (
          school_id,
          name,
          level
        ) VALUES (
          school_rec.id,
          class_names[class_num],
          CASE 
            WHEN class_num <= 3 THEN 1
            WHEN class_num <= 6 THEN 2
            ELSE 3
          END
        );
      END LOOP;
      RAISE NOTICE 'Created classes for school: %', school_rec.id;
    END IF;
  END LOOP;
END $$;

-- Step 3: Ensure arms exist (A, B, C for each class if not present)
DO $$ 
DECLARE
  school_rec RECORD;
  class_rec RECORD;
  arm_letter CHAR(1);
  arm_id UUID;
BEGIN
  FOR school_rec IN SELECT id FROM schools WHERE status = 'ACTIVE' LOOP
    FOR class_rec IN SELECT id FROM classes WHERE school_id = school_rec.id LOOP
      -- Check if class has arms
      IF NOT EXISTS (SELECT 1 FROM class_arm_combos WHERE class_id = class_rec.id LIMIT 1) THEN
        FOR arm_letter IN ('A', 'B', 'C') LOOP
          -- Get or create arm
          SELECT id INTO arm_id FROM arms 
          WHERE school_id = school_rec.id AND name = arm_letter 
          LIMIT 1;
          
          IF arm_id IS NULL THEN
            INSERT INTO arms (school_id, name) 
            VALUES (school_rec.id, arm_letter)
            RETURNING id INTO arm_id;
          END IF;
          
          -- Create class_arm_combo
          INSERT INTO class_arm_combos (
            school_id,
            class_id,
            arm_id
          ) VALUES (
            school_rec.id,
            class_rec.id,
            arm_id
          ) ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Processed arms for all schools';
END $$;

-- Step 4: Verify results
SELECT 
  'Classes' as entity,
  school_id,
  COUNT(*) as count
FROM classes
GROUP BY school_id
UNION ALL
SELECT 
  'Terms' as entity,
  school_id,
  COUNT(*) as count
FROM academic_terms
GROUP BY school_id
UNION ALL
SELECT 
  'Arms' as entity,
  school_id,
  COUNT(*) as count
FROM arms
GROUP BY school_id
UNION ALL
SELECT 
  'Class-Arm Combos' as entity,
  school_id,
  COUNT(*) as count
FROM class_arm_combos
GROUP BY school_id
ORDER BY entity, school_id;

COMMIT;
