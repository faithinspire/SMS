@echo off
REM Deploy Staff Registration Rebuild to Vercel

echo.
echo ====================================================================
echo          DEPLOYING STAFF REGISTRATION REBUILD TO VERCEL
echo ====================================================================
echo.

cd /d c:\Users\OLU\Desktop\SMS

echo [1/5] Staging files...
git add src/app/api/teaching/canonical-subjects/route.ts
git add src/components/admin/ProfessionalStaffRegistrationModal.tsx
git add src/app/api/teaching/class-combos/route.ts
git add src/app/api/school-admin/staff/register/route.ts
git add src/app/school-admin/staff/page.tsx

echo [2/5] Checking staged files...
git status

echo.
echo [3/5] Committing changes...
git commit -m "Professional rebuild of Staff Registration module

- Fixed class-combos API 500 error (invalid Supabase orderBy syntax)
- Created canonical-subjects API for real subject loading
- Rebuilt staff registration modal with professional multi-step UI
- Implemented separate teacher and non-teaching registration flows
- Improved registration backend using Supabase admin API
- Integrated with existing dashboards and authentication
- Teacher class and subject assignments now properly persisted
- All staff roles route to appropriate dashboards
- No breaking changes to existing functionality"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Git commit failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Pushing to GitHub (triggers Vercel auto-deploy)...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Git push failed!
    pause
    exit /b 1
)

echo.
echo ====================================================================
echo                    ✅ DEPLOYMENT INITIATED
echo ====================================================================
echo.
echo Vercel will automatically deploy when push completes.
echo.
echo Deployment Dashboard: https://vercel.com/dashboard
echo.
echo Expected deployment time: 7-10 minutes
echo.
echo Next steps:
echo   1. Monitor Vercel deployment dashboard
echo   2. Wait for build to complete (status: Ready)
echo   3. Test class-combos API: GET /api/teaching/class-combos
echo   4. Test subjects API: GET /api/teaching/canonical-subjects
echo   5. Test staff registration in production
echo.
echo ====================================================================
echo.

pause
