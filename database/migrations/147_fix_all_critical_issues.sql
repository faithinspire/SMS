-- ============================================================================
-- Migration 147: CRITICAL FIXES FOR BROADCASTS, RESULTS, AND ASSIGNMENTS
-- ============================================================================

-- ============================================================================
-- PART 1: FIX BROADCAST PERMISSIONS - Staff can now see broadcasts
-- ============================================================================

-- Ensure RLS is disabled on broadcasts to allow anon access
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anon role (for web client access)
GRANT SELECT, INSERT, UPDATE ON broadcasts TO anon;
GRANT SELECT, INSERT, UPDATE ON broadcast_recipients TO anon;

-- Grant all permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON broadcast_recipients TO authenticated;

-- ============================================================================
-- PART 2: FIX SUBJECT STUDENT ENROLLMENT
-- ============================================================================

-- Ensure subject_enrollments table has proper data for teachers to see their students
-- Create index if missing
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_subject_id 
ON subject_enrollments(subject_id);

CREATE INDEX IF NOT EXISTS idx_subject_enrollments_student_id 
ON subject_enrollments(student_id);

CREATE INDEX IF NOT EXISTS idx_subject_enrollments_school_id 
ON subject_enrollments(school_id);

-- ============================================================================
-- PART 3: AUTO-POPULATE CBT SCORES TO RESULTS
-- ============================================================================

-- Create trigger to auto-calculate scores from cbt_scores to score_sheets
-- when a CBT is submitted
CREATE OR REPLACE FUNCTION auto_populate_cbt_scores_to_results()
RETURNS TRIGGER AS $$
BEGIN
  -- After CBT scores are inserted, update score_sheets with the score
  UPDATE score_sheets
  SET 
    score = NEW.total_score,
    assessment_type = 'CBT',
    updated_at = NOW()
  WHERE 
    student_id = NEW.student_id 
    AND subject_id = NEW.subject_id
    AND term_id = (
      SELECT term_id FROM cbt_assessments 
      WHERE id = NEW.assessment_id LIMIT 1
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_populate_cbt_scores ON cbt_scores;

-- Create trigger
CREATE TRIGGER trigger_auto_populate_cbt_scores
AFTER INSERT OR UPDATE ON cbt_scores
FOR EACH ROW
EXECUTE FUNCTION auto_populate_cbt_scores_to_results();

-- ============================================================================
-- PART 4: FIX ASSIGNMENTS QUERY - Resolve relationship ambiguity
-- ============================================================================

-- The error "Could not embed because more than one relationship was found for
-- 'students' and 'users'" means there are multiple FK relationships between
-- students and users tables.
--
-- Check relationships and ensure submissions query uses explicit join path

-- Create view to properly join students, assignments, and submissions
CREATE OR REPLACE VIEW assignment_submissions_view AS
SELECT 
  a.id as assignment_id,
  a.title,
  a.description,
  a.created_at as assignment_date,
  s.id as student_id,
  s.full_name as student_name,
  s.admission_number,
  sub.id as submission_id,
  sub.submission_date,
  sub.file_url,
  sub.status,
  sub.grade,
  sub.feedback
FROM assignments a
LEFT JOIN student_class sc ON a.class_id = sc.class_id
LEFT JOIN students s ON sc.student_id = s.id
LEFT JOIN submissions sub ON a.id = sub.assignment_id AND s.id = sub.student_id
WHERE a.deleted_at IS NULL;

-- Create proper index for fast lookups
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student 
ON submissions(assignment_id, student_id);

-- ============================================================================
-- PART 5: ENSURE AUTO-CALCULATION FOR CBTSCORES
-- ============================================================================

-- Make sure cbt_scores are properly calculated with total_score field
-- If cbt_scores table is missing total_score, add it
ALTER TABLE cbt_scores 
ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2) DEFAULT 0;

-- Add trigger to calculate total score from options if not set
CREATE OR REPLACE FUNCTION calculate_cbt_total_score()
RETURNS TRIGGER AS $$
BEGIN
  -- If total_score is 0 or null, calculate from individual scores
  IF NEW.total_score = 0 OR NEW.total_score IS NULL THEN
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN os.is_correct THEN 1 
          ELSE 0 
        END
      ), 0)
    INTO NEW.total_score
    FROM option_scores os
    WHERE os.cbt_score_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_cbt_total ON cbt_scores;
CREATE TRIGGER trigger_calculate_cbt_total
BEFORE INSERT OR UPDATE ON cbt_scores
FOR EACH ROW
EXECUTE FUNCTION calculate_cbt_total_score();

-- ============================================================================
-- PART 6: VERIFY ALL TABLES HAVE PROPER PERMISSIONS
-- ============================================================================

-- Grant permissions to all critical tables for anon (web client) access
GRANT SELECT ON schools TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON students TO anon;
GRANT SELECT ON classes TO anon;
GRANT SELECT ON subjects TO anon;
GRANT SELECT ON subject_enrollments TO anon;
GRANT SELECT ON score_sheets TO anon;
GRANT SELECT ON cbt_scores TO anon;
GRANT SELECT ON assignments TO anon;
GRANT SELECT ON submissions TO anon;

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subject_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON score_sheets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON cbt_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON submissions TO authenticated;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check RLS status
SELECT 'Broadcasting permissions fixed' as status,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'broadcasts') as broadcasts_rls,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'broadcast_recipients') as recipients_rls;

-- Check triggers
SELECT trigger_name, table_name FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_%' AND table_schema = 'public';

-- Check views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' AND table_name LIKE '%view';
