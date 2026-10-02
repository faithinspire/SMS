@echo off
REM Complete SMS Deployment Script
REM This script commits the fixes and pushes to GitHub

cd /d "c:\Users\OLU\Desktop\SMS"

echo.
echo ================================
echo SMS COMPLETE DEPLOYMENT
echo ================================
echo.

echo Checking git status...
git status --short
echo.

echo Staging files...
git add "src/services/staff-registration.service.ts"
git add "src/app/school-admin/students/[id]/page.tsx"
git add "src/app/school-admin/transactions/page.tsx"
echo Files staged successfully
echo.

echo Creating commit...
git commit -m "^🔧 HARD FIX: Teacher subject assignment + PGRST116 error handling^

FIXES:^
- Fix staff registration table name (subject_teacher_assignments)^
- Replace .single() with .maybeSingle() for graceful error handling^
- Maintain multi-tenant data isolation via school_id indexes^

DEPLOYMENT READY: Execute Supabase migrations"

if %errorlevel% equ 0 (
    echo Commit created successfully
) else (
    echo No changes to commit or commit failed
)
echo.

echo Pushing to GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo Code pushed successfully
) else (
    echo Push failed
    goto error
)
echo.

echo.
echo ================================
echo NEXT STEPS:
echo ================================
echo.
echo 1. Go to https://supabase.com
echo 2. Open SMS project
echo 3. Go to SQL Editor
echo 4. Create New Query
echo 5. Copy-paste RUN_THIS_IN_SUPABASE_NOW.sql
echo 6. Click RUN
echo.
echo 7. Check Vercel deployment at https://vercel.com
echo 8. Test in production after deployment completes
echo.
echo ================================
echo DEPLOYMENT CODE COMPLETE
echo ================================
echo.

pause
goto end

:error
echo.
echo ERROR: Deployment failed
pause

:end
