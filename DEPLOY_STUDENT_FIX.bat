@echo off
REM ============================================================================
REM DEPLOY STUDENT REGISTRATION DROPDOWN FIX TO VERCEL
REM ============================================================================
REM
REM This script deploys the fix for student registration dropdowns
REM - Sessions now load from academic_sessions
REM - Terms now load from terms (not academic_terms)
REM - Classes load with correct columns
REM - Subjects load correctly
REM
REM ============================================================================

setlocal enabledelayedexpansion

color 0a
echo.
echo ============================================================================
echo 🚀 DEPLOY STUDENT REGISTRATION FIX
echo ============================================================================
echo.

REM Navigate to repo
echo [1/3] Navigating to repository...
cd /d c:\Users\OLU\Desktop\SMS
if errorlevel 1 (
    echo ❌ ERROR: Could not navigate to repository
    pause
    exit /b 1
)
echo ✅ Repository found
echo.

REM Configure Git
echo [2/3] Configuring Git...
git config user.email "deploy@schoolms.app"
git config user.name "Auto Deploy Bot"
echo ✅ Git configured
echo.

REM Stage, commit, and push
echo [3/3] Staging changes, committing, and pushing...
git add src/app/api/school-admin/students/dropdown-data/route.ts
if errorlevel 1 (
    echo ❌ ERROR: Could not stage changes
    pause
    exit /b 1
)
echo ✅ Changes staged

git commit -m "🔧 Fix student registration dropdowns: use correct table names (terms not academic_terms)"
if errorlevel 1 (
    echo ⚠️ Nothing new to commit (or error)
) else (
    echo ✅ Commit created
)

echo.
echo Pushing to GitHub (Vercel auto-deploys)...
git push origin main
if errorlevel 1 (
    echo ⚠️ Push failed - Check GitHub credentials
    pause
    exit /b 1
)
echo ✅ Pushed to GitHub
echo.

echo ============================================================================
echo ✅ DEPLOYMENT INITIATED
echo ============================================================================
echo.
echo 📊 Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta
echo.
echo ⏱️ Timeline:
echo    NOW:       Push sent to GitHub
echo    +30 sec:   GitHub receives push
echo    +1 min:    Vercel webhook triggered
echo    +2 min:    Build starts
echo    +5-7 min:  Build completes (green checkmark)
echo    +7 min:    🎉 LIVE
echo.
echo 📋 Next steps:
echo    1. Wait 5-7 minutes for Vercel build
echo    2. Test student registration:
echo       https://sms-gold-eta.vercel.app/auth/student-register
echo    3. Verify dropdowns load:
echo       ✅ Select Session (should show options)
echo       ✅ Select Term (should show options)
echo       ✅ Select Class (should show classes with arms)
echo       ✅ Subjects (should load)
echo.
echo ============================================================================
echo ✅ FIX DEPLOYED:
echo    ✅ src/app/api/school-admin/students/dropdown-data/route.ts
echo ============================================================================
echo.
pause
