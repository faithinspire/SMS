-- School Management System - PostgreSQL Initial Schema
-- Supabase will execute this via migrations
-- All tables include school_id for multi-tenancy

-- ============================================================================
-- 1. CORE TENANCY LAYER
-- ============================================================================

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PRIMARY', 'SECONDARY', 'BOTH')),
  email TEXT,
  phone TEXT,
  address TEXT,
  subscription_plan TEXT DEFAULT 'standard',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER', 'TEACHER', 'ACCOUNTANT', 'STAFF', 'STUDENT')),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, email) -- email unique within school, nullable for PIN-only users
);

CREATE TABLE login_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  attempts INT DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(school_id, user_id)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  scoped_to_class_id UUID,
  scoped_to_subject_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id, school_id, scoped_to_class_id, scoped_to_subject_id)
);

-- ============================================================================
-- 2. ACADEMIC STRUCTURE
-- ============================================================================

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PRIMARY', 'SECONDARY')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, name, level)
);

CREATE TABLE arms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, name)
);

-- Class + Arm combinations (e.g., "JSS2A", "Primary 3B")
CREATE TABLE class_arm_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  arm_id UUID NOT NULL REFERENCES arms(id) ON DELETE CASCADE,
  class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, class_id, arm_id)
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  applicable_to_levels INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, name)
);

-- Subject taught by teacher in specific class+arm
CREATE TABLE subject_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, subject_id, class_arm_combo_id, teacher_id)
);

-- ============================================================================
-- 3. STUDENTS & STAFF
-- ============================================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  date_of_birth DATE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE RESTRICT,
  class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, admission_number)
);

-- Student selects subjects for a term (auto-links to subject teachers)
CREATE TABLE student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  position TEXT,
  employment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. ACADEMIC TERMS & SESSIONS
-- ============================================================================

CREATE TABLE terms (
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

-- ============================================================================
-- 5. GRADING & SCORE SHEETS
-- ============================================================================

CREATE TABLE score_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  test1 NUMERIC(5,2),
  test2 NUMERIC(5,2),
  test3 NUMERIC(5,2),
  test4 NUMERIC(5,2),
  exam NUMERIC(5,2),
  total NUMERIC(5,2) GENERATED ALWAYS AS (
    COALESCE(test1, 0) + COALESCE(test2, 0) + COALESCE(test3, 0) + COALESCE(test4, 0) + COALESCE(exam, 0)
  ) STORED,
  grade VARCHAR(2),
  test1_source VARCHAR(20),
  test2_source VARCHAR(20),
  test3_source VARCHAR(20),
  test4_source VARCHAR(20),
  exam_source VARCHAR(20),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, student_id, subject_id, term_id),
  CHECK (test1 IS NULL OR (test1 >= 0 AND test1 <= 10)),
  CHECK (test2 IS NULL OR (test2 >= 0 AND test2 <= 10)),
  CHECK (test3 IS NULL OR (test3 >= 0 AND test3 <= 10)),
  CHECK (test4 IS NULL OR (test4 >= 0 AND test4 <= 10)),
  CHECK (exam IS NULL OR (exam >= 0 AND exam <= 60))
);

CREATE TABLE report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pdf_url TEXT,
  UNIQUE(school_id, student_id, term_id)
);

-- ============================================================================
-- 6. PAYMENTS & ACCOUNTS
-- ============================================================================

CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  applicable_to_classes UUID[],
  is_mandatory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE_GATEWAY')),
  payment_gateway_ref TEXT,
  gateway_response JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL,
  receipt_type VARCHAR(50) NOT NULL CHECK (receipt_type IN ('STUDENT_FEE', 'STAFF_SALARY')),
  pdf_url TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, reference_number)
);

CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'OVERDUE')),
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  salary_id UUID NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
  gross_amount NUMERIC(12,2) NOT NULL,
  deductions JSONB,
  net_amount NUMERIC(12,2) NOT NULL,
  pdf_url TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. CBT (COMPUTER-BASED TESTS)
-- ============================================================================

CREATE TABLE cbt_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('TEST', 'EXAM')),
  test_number INT CHECK (test_number IS NULL OR (test_number >= 1 AND test_number <= 4)),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INT NOT NULL,
  total_marks NUMERIC(5,2),
  passing_percentage NUMERIC(5,2),
  allow_review BOOLEAN DEFAULT TRUE,
  randomize_questions BOOLEAN DEFAULT FALSE,
  randomize_options BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cbt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  cbt_exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'THEORY')),
  question_text TEXT NOT NULL,
  marks NUMERIC(5,2) NOT NULL,
  display_order INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cbt_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  display_order INT
);

CREATE TABLE cbt_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  cbt_exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  auto_submitted BOOLEAN DEFAULT FALSE,
  score NUMERIC(5,2),
  answers JSONB,
  tab_switches INT DEFAULT 0,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cbt_submission_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES cbt_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  marks_awarded NUMERIC(5,2)
);

-- ============================================================================
-- 8. ACADEMIC CONTENT (LESSONS, ASSIGNMENTS, ATTENDANCE)
-- ============================================================================

CREATE TABLE lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  attachments JSONB,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  attachments JSONB,
  due_date DATE,
  max_marks NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submission_text TEXT,
  submission_files JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_late BOOLEAN DEFAULT FALSE,
  marks_awarded NUMERIC(5,2),
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(assignment_id, student_id)
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, student_id, date)
);

-- ============================================================================
-- 9. ANNOUNCEMENTS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  scope VARCHAR(50) NOT NULL CHECK (scope IN ('SCHOOL_WIDE', 'CLASS', 'ROLE')),
  target_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  target_role VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PAYMENT', 'GRADE', 'ASSIGNMENT', 'ANNOUNCEMENT', 'SYSTEM')),
  related_entity_id UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 10. AUDIT & COMPLIANCE
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_arm_combo_id ON students(class_arm_combo_id);
CREATE INDEX idx_staff_school_id ON staff(school_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_subjects_school_id ON subjects(school_id);
CREATE INDEX idx_score_sheets_school_id ON score_sheets(school_id);
CREATE INDEX idx_score_sheets_student_id ON score_sheets(student_id);
CREATE INDEX idx_score_sheets_term_id ON score_sheets(term_id);
CREATE INDEX idx_payments_school_id ON payments(school_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_cbt_exams_school_id ON cbt_exams(school_id);
CREATE INDEX idx_cbt_submissions_school_id ON cbt_submissions(school_id);
CREATE INDEX idx_cbt_submissions_student_id ON cbt_submissions(student_id);
CREATE INDEX idx_cbt_submissions_exam_id ON cbt_submissions(cbt_exam_id);
CREATE INDEX idx_assignments_school_id ON assignments(school_id);
CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX idx_attendance_school_id ON attendance(school_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_terms_school_id ON terms(school_id);
CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_login_pins_school_id ON login_pins(school_id);
CREATE INDEX idx_login_pins_user_id ON login_pins(user_id);

-- ============================================================================
-- 12. ROW-LEVEL SECURITY (RLS) - MULTI-TENANCY ENFORCEMENT
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE arms ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_arm_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submission_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's school_id from JWT
CREATE OR REPLACE FUNCTION current_user_school_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'school_id')::uuid;
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE;

-- RLS Policy: Users can only see data from their school
-- (This is a basic example; application should enforce more granular access control)
CREATE POLICY school_isolation_students ON students
  FOR SELECT
  USING (school_id = current_user_school_id());

CREATE POLICY school_isolation_users ON users
  FOR SELECT
  USING (school_id = current_user_school_id());

CREATE POLICY school_isolation_score_sheets ON score_sheets
  FOR SELECT
  USING (school_id = current_user_school_id());

-- ... similar policies for other tables (abbreviated for brevity)

-- ============================================================================
-- 13. SEED DATA (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================

-- Seed roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Platform administrator'),
  ('school_admin', 'School administrator'),
  ('principal', 'School principal (secondary)'),
  ('head_teacher', 'Head teacher (primary)'),
  ('teacher', 'Class or subject teacher'),
  ('class_teacher', 'Class teacher'),
  ('subject_teacher', 'Subject teacher'),
  ('accountant', 'School accountant'),
  ('staff', 'Non-teaching staff'),
  ('student', 'Student')
ON CONFLICT (name) DO NOTHING;
