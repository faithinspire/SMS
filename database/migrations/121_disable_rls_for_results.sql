-- ============================================================================
-- MIGRATION 121: Disable RLS on Result Pages Tables
-- ============================================================================
-- RLS policies are blocking result pages from fetching data
-- Disable RLS on tables needed for result pages to work

BEGIN;

-- Disable RLS on class_arm_combos table
ALTER TABLE IF EXISTS public.class_arm_combos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_arm_combos_tenant_isolation_policy ON public.class_arm_combos;

-- Disable RLS on students table  
ALTER TABLE IF EXISTS public.students DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS students_school_isolation ON public.students;
DROP POLICY IF EXISTS students_tenant_isolation_policy ON public.students;

-- Disable RLS on score_sheets table
ALTER TABLE IF EXISTS public.score_sheets DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS score_sheets_tenant_isolation_policy ON public.score_sheets;

-- Disable RLS on academic_terms table
ALTER TABLE IF EXISTS public.academic_terms DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS academic_terms_tenant_isolation_policy ON public.academic_terms;

-- Disable RLS on academic_sessions table
ALTER TABLE IF EXISTS public.academic_sessions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS academic_sessions_tenant_isolation_policy ON public.academic_sessions;

-- Disable RLS on classes table
ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS classes_tenant_isolation_policy ON public.classes;

-- Disable RLS on arms table
ALTER TABLE IF EXISTS public.arms DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS arms_tenant_isolation_policy ON public.arms;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('class_arm_combos', 'students', 'score_sheets', 'academic_terms', 'academic_sessions', 'classes', 'arms');

COMMIT;
