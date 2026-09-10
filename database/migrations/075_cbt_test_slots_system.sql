-- ============================================================================
-- Migration 075: Professional CBT Test Slots System
-- Allows teachers to assign up to 4 CBT tests per subject per term
-- Each test score automatically syncs to student results (CA1-4 columns)
-- ============================================================================

-- Main table: CBT Test Slot Assignments (max 4 per subject per term)
CREATE TABLE IF NOT EXISTS cbt_test_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  
  -- Test assignment
  test_number INT NOT NULL CHECK (test_number >= 1 AND test_number <= 4),
  test_name VARCHAR(100) NOT NULL DEFAULT 'Test',
  test_type VARCHAR(20) NOT NULL DEFAULT 'CBT' CHECK (test_type IN ('CBT', 'MANUAL')),
  
  -- Associated CBT exam (null if manual entry)
  cbt_exam_id UUID REFERENCES cbt_exams(id) ON DELETE SET NULL,
  
  -- Scores can be entered manually or auto-synced from CBT
  max_score INT NOT NULL DEFAULT 20,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DELETED', 'ARCHIVED')),
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table: Student CBT Test Scores (synced from cbt_submissions or manual entry)
CREATE TABLE IF NOT EXISTS cbt_test_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_slot_id UUID NOT NULL REFERENCES cbt_test_slots(id) ON DELETE CASCADE,
  
  -- Score data
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 20,
  percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Source of score
  source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('CBT_AUTO', 'MANUAL', 'IMPORTED')),
  cbt_submission_id UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
  
  -- Who entered/modified
  entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one score per student per test slot
  UNIQUE(student_id, test_slot_id)
);

-- Indexes for performance
CREATE INDEX idx_cbt_test_slots_school_subject 
  ON cbt_test_slots(school_id, subject_id);

CREATE INDEX idx_cbt_test_slots_class_term 
  ON cbt_test_slots(class_arm_combo_id, term_id);

CREATE INDEX idx_cbt_test_slots_exam 
  ON cbt_test_slots(cbt_exam_id);

CREATE INDEX idx_cbt_test_scores_student 
  ON cbt_test_scores(student_id, school_id);

CREATE INDEX idx_cbt_test_scores_slot 
  ON cbt_test_scores(test_slot_id);

CREATE INDEX idx_cbt_test_scores_submission 
  ON cbt_test_scores(cbt_submission_id);

-- Trigger: Update percentage when score changes
CREATE OR REPLACE FUNCTION calculate_cbt_test_percentage()
RETURNS TRIGGER AS $$
BEGIN
  NEW.percentage := CASE 
    WHEN NEW.max_score > 0 THEN (NEW.score / NEW.max_score) * 100
    ELSE 0
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cbt_test_scores_percentage_trigger
BEFORE INSERT OR UPDATE ON cbt_test_scores
FOR EACH ROW
EXECUTE FUNCTION calculate_cbt_test_percentage();

-- Trigger: Update timestamp
CREATE OR REPLACE FUNCTION update_cbt_test_slots_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cbt_test_slots_update_timestamp
BEFORE UPDATE ON cbt_test_slots
FOR EACH ROW
EXECUTE FUNCTION update_cbt_test_slots_timestamp();

-- Trigger: Enforce max 4 tests per subject per term (with soft delete awareness)
CREATE OR REPLACE FUNCTION enforce_max_4_tests_per_subject()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
BEGIN
  -- Count active (non-deleted) tests with this test_number for the subject/class/term
  SELECT COUNT(*) INTO active_count
  FROM cbt_test_slots
  WHERE school_id = NEW.school_id
    AND subject_id = NEW.subject_id
    AND class_arm_combo_id = NEW.class_arm_combo_id
    AND term_id = NEW.term_id
    AND test_number = NEW.test_number
    AND status != 'DELETED'
    AND id != NEW.id;  -- Exclude current record on updates

  IF active_count > 0 THEN
    RAISE EXCEPTION 'Test slot % already exists for this subject/class/term', NEW.test_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_tests_trigger
BEFORE INSERT OR UPDATE ON cbt_test_slots
FOR EACH ROW
EXECUTE FUNCTION enforce_max_4_tests_per_subject();

-- View: Student CBT Test Scores with details
CREATE OR REPLACE VIEW v_student_cbt_test_scores AS
SELECT 
  cts.id,
  cts.school_id,
  cts.student_id,
  s.admission_number,
  cts.test_slot_id,
  cts_slot.test_number,
  cts_slot.test_name,
  cts_slot.subject_id,
  subj.name as subject_name,
  cts_slot.term_id,
  cts.score,
  cts.max_score,
  cts.percentage,
  cts.source,
  cts.cbt_submission_id,
  cts_slot.cbt_exam_id,
  cts.created_at,
  cts.updated_at
FROM cbt_test_scores cts
JOIN cbt_test_slots cts_slot ON cts.test_slot_id = cts_slot.id AND cts_slot.status != 'DELETED'
JOIN students s ON cts.student_id = s.id
JOIN subjects subj ON cts_slot.subject_id = subj.id;

-- Verify migration
SELECT 'Migration 075: CBT Test Slots System - APPLIED SUCCESSFULLY' as status;
