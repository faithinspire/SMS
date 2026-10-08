@echo off
REM Deployment script for critical fixes (2026-10-08)

echo ============================================
echo DEPLOYING CRITICAL PRODUCTION FIXES
echo ============================================
echo.
echo 1. Staging modified files...
git add src/app/school-admin/students/page.tsx
git add src/app/student/dashboard/page.tsx
git add src/app/student/cbt/[id]/page.tsx
git add src/app/student/results/page.tsx
git add src/app/student/account-locked-admin/page.tsx
git add src/app/api/school/academic/sessions/route.ts
git add src/app/school-admin/results/page.tsx
git add database/migrations/168_ensure_academic_sessions_exist.sql

echo.
echo 2. Commit changes...
git commit -m "Fix: Lock persistence, enforcement, and Results sessions dropdown (2026-10-08)"

echo.
echo 3. Pushing to main branch...
git push origin main

echo.
echo ============================================
echo DEPLOYMENT INITIATED
echo ============================================
echo.
echo Next steps:
echo 1. Monitor Vercel build at: https://vercel.com/dashboard
echo 2. Run SQL migration 168 in Supabase
echo 3. Test in production:
echo    - Lock student, refresh, verify still locked
echo    - Try accessing locked student dashboard
echo    - Test Results sessions dropdown
echo.
pause
