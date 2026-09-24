@echo off
REM ============================================================================
REM PUSH 3 CRITICAL FIXES TO PRODUCTION
REM ============================================================================

echo.
echo ========================================================================
echo                    PUSHING 3 CRITICAL FIXES
echo ========================================================================
echo.

cd c:\Users\OLU\Desktop\SMS

echo [1/4] Checking git status...
git status
echo.

echo [2/4] Staging all fixed files...
git add database/migrations/140_complete_curriculum_all_schools.sql ^
        database/migrations/142_validate_and_fix_term_uuids.sql ^
        src/app/api/admin/register-student-direct/route.ts ^
        src/components/admin/StudentRegistrationModal.tsx
echo ✅ Files staged

echo.
echo [3/4] Committing changes...
git commit -m "HOTFIX: Deploy 3 critical production fixes (migration 140 syntax fixed, term UUIDs validated, student full_name preserved)"
echo ✅ Committed

echo.
echo [4/4] Pushing to GitHub...
git push origin main
echo ✅ Pushed to production

echo.
echo ========================================================================
echo SUCCESS! Fixes pushed to production
echo ========================================================================
echo.
echo Next steps:
echo   1. Go to: https://vercel.com/dashboard
echo   2. Wait for build to complete (should show green "Ready" status)
echo   3. Execute Migration 142 in Supabase SQL Editor
echo   4. Test all fixes
echo.
echo For details: Read 00_DO_THIS_RIGHT_NOW.md
echo.
pause
