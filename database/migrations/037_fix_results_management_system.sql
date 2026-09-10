-- Migration 037: Fix Results Management System
-- Creates proper tables for teacher result entry, student subject enrollment, and result tracking

-- 1. Ensure teacher_assignments table exists (links teachers to classes and subjects)
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_arm_combo_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject ON teacher_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school ON teacher_assignments(school_id);

ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to teacher_assignments" ON teacher_assignments;
CREATE POLICY "Allow all access to teacher_assignments" ON teacher_assignments FOR ALL USING (true);

-- 2. Ensure student_subject_enrollment table exists (links students to subjects)
CREATE TABLE IF NOT EXISTS student_subject_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id, class_arm_combo_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subject_enrollment_student ON student_subject_enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_enrollment_subject ON student_subject_enrollment(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_enrollment_class ON student_subject_enrollment(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_enrollment_school ON student_subject_enrollment(school_id);

ALTER TABLE student_subject_enrollment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to student_subject_enrollment" ON student_subject_enrollment;
CREATE POLICY "Allow all access to student_subject_enrollment" ON student_subject_enrollment FOR ALL USING (true);

-- 3. Ensure result_entries table exists (stores teacher-entered scores)
CREATE TABLE IF NOT EXISTS result_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  
  -- Test scores (0-10 each, total 40)
  test1_score NUMERIC(5,2) CHECK (test1_score IS NULL OR (test1_score >= 0 AND test1_score <= 10)),
  test2_score NUMERIC(5,2) CHECK (test2_score IS NULL OR (test2_score >= 0 AND test2_score <= 10)),
  test3_score NUMERIC(5,2) CHECK (test3_score IS NULL OR (test3_score >= 0 AND test3_score <= 10)),
  test4_score NUMERIC(5,2) CHECK (test4_score IS NULL OR (test4_score >= 0 AND test4_score <= 10)),
  
  -- Test total (auto-calculated: sum of test1-4, max 40)
  test_total NUMERIC(5,2) DEFAULT 0 CHECK (test_total >= 0 AND test_total <= 40),
  
  -- Exam score (0-60)
  exam_score NUMERIC(5,2) CHECK (exam_score IS NULL OR (exam_score >= 0 AND exam_score <= 60)),
  
  -- CBT exam score (if taken, overrides manual exam entry)
  cbt_exam_score NUMERIC(5,2) CHECK (cbt_exam_score IS NULL OR (cbt_exam_score >= 0 AND cbt_exam_score <= 60)),
  cbt_submission_id UUID REFERENCES cbt_submissions(id) ON DELETE SET NULL,
  
  -- Final total (auto-calculated: test_total + exam_score, max 100)
  total_score NUMERIC(5,2) DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  
  -- Grade and remark
  grade TEXT,
  remark TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one entry per student-subject per term
  UNIQUE(student_id, subject_id, class_arm_combo_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_result_entries_student ON result_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_result_entries_subject ON result_entries(subject_id);
CREATE INDEX IF NOT EXISTS idx_result_entries_teacher ON result_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_result_entries_school ON result_entries(school_id);
CREATE INDEX IF NOT EXISTS idx_result_entries_class ON result_entries(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_result_entries_student_subject ON result_entries(student_id, subject_id);

ALTER TABLE result_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to result_entries" ON result_entries;
CREATE POLICY "Allow all access to result_entries" ON result_entries FOR ALL USING (true);

-- 4. Create function to auto-calculate test_total
CREATE OR REPLACE FUNCTION calculate_test_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.test_total := COALESCE(NEW.test1_score, 0) + COALESCE(NEW.test2_score, 0) + 
                     COALESCE(NEW.test3_score, 0) + COALESCE(NEW.test4_score, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to auto-calculate total_score
CREATE OR REPLACE FUNCTION calculate_total_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Use CBT score if available, otherwise use manual exam score
  NEW.total_score := NEW.test_total + COALESCE(COALESCE(NEW.cbt_exam_score, NEW.exam_score), 0);
  
  -- Auto-assign grade based on total score
  IF NEW.total_score >= 70 THEN
    NEW.grade := 'A';
  ELSIF NEW.total_score >= 60 THEN
    NEW.grade := 'B';
  ELSIF NEW.total_score >= 50 THEN
    NEW.grade := 'C';
  ELSIF NEW.total_score >= 40 THEN
    NEW.grade := 'D';
  ELSE
    NEW.grade := 'F';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
DROP TRIGGER IF EXISTS trg_calculate_test_total ON result_entries;
CREATE TRIGGER trg_calculate_test_total
BEFORE INSERT OR UPDATE ON result_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_test_total();

DROP TRIGGER IF EXISTS trg_calculate_total_score ON result_entries;
CREATE TRIGGER trg_calculate_total_score
BEFORE INSERT OR UPDATE ON result_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_total_score();

-- 7. Ensure cbt_submissions table has subject_id if it doesn't
ALTER TABLE cbt_submissions ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_subject ON cbt_submissions(subject_id);

-- 8. Create view for teachers to easily see their assigned classes
CREATE OR REPLACE VIEW teacher_class_subjects AS
SELECT DISTINCT
  ta.teacher_id,
  ta.class_arm_combo_id,
  ta.subject_id,
  ta.school_id,
  c.name as class_name,
  a.name as arm_name,
  s.name as subject_name
FROM teacher_assignments ta
LEFT JOIN class_arm_combos cac ON ta.class_arm_combo_id = cac.id
LEFT JOIN classes c ON cac.class_id = c.id
LEFT JOIN arms a ON cac.arm_id = a.id
LEFT JOIN subjects s ON ta.subject_id = s.id;

-- 9. Create view for students to see their enrolled subjects
CREATE OR REPLACE VIEW student_enrolled_subjects AS
SELECT DISTINCT
  sse.student_id,
  sse.subject_id,
  sse.class_arm_combo_id,
  sse.school_id,
  s.name as subject_name,
  s.code as subject_code
FROM student_subject_enrollment sse
LEFT JOIN subjects s ON sse.subject_id = s.id;
