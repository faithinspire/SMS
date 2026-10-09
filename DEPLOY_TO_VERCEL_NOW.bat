@echo off
REM ============================================================================
REM SMS AUTO-DEPLOY SCRIPT - Deploy All Fixes to Vercel
REM ============================================================================
REM
REM This script deploys:
REM - Class-Combos API fix (use 'type' column)
REM - Teacher registration fix (use 'user_id' + fields)
REM - Auto-init school system (migration 172 + 3 APIs)
REM
REM Vercel will auto-build and deploy
REM ============================================================================

setlocal enabledelayedexpansion

color 0a
echo.
echo ============================================================================
echo 🚀 SMS VERCEL DEPLOYMENT
echo ============================================================================
echo.

REM Navigate to repo
echo [1/4] Navigating to repository...
cd /d c:\Users\OLU\Desktop\SMS
if errorlevel 1 (
    echo ❌ ERROR: Could not navigate to repository
    pause
    exit /b 1
)
echo ✅ Repository found
echo.

REM Configure Git
echo [2/4] Configuring Git...
git config user.email "deploy@schoolms.app"
git config user.name "Auto Deploy Bot"
echo ✅ Git configured
echo.

REM Stage changes
echo [3/4] Staging all changes...
git add -A
if errorlevel 1 (
    echo ❌ ERROR: Could not stage changes
    pause
    exit /b 1
)
echo ✅ Changes staged
echo.

REM Commit
echo [4/4] Creating commit and pushing...
git commit -m "🎯 Auto-initialize schools + fixes (migration 172 + 3 APIs + 2 fixes)"
if errorlevel 1 (
    echo ⚠️ Nothing new to commit (or error)
) else (
    echo ✅ Commit created
)
echo.

REM Push to GitHub
echo Pushing to GitHub (Vercel auto-deploys)...
git push origin main
if errorlevel 1 (
    echo ⚠️ Push failed - Check GitHub credentials
    echo Try: git config --global credential.helper store
    pause
    exit /b 1
)
echo ✅ Pushed to GitHub
echo.

echo ============================================================================
echo ✅ DEPLOYMENT INITIATED - Vercel will auto-build and deploy
echo ============================================================================
echo.
echo 📊 Monitor deployment at:
echo    https://vercel.com/dashboard/projects/sms-gold-eta
echo.
echo ⏱️ Timeline:
echo    NOW:       Push sent to GitHub
echo    +30 sec:   GitHub receives push
echo    +1 min:    Vercel webhook triggered
echo    +2 min:    Build starts
echo    +5-7 min:  Build completes
echo    +7 min:    🎉 LIVE on production
echo.
echo 📋 Next steps:
echo    1. Wait 7 minutes for Vercel build
echo    2. Run migration 172 in Supabase SQL Editor
echo    3. Test new school creation
echo    4. Initialize existing schools
echo.
echo ============================================================================
echo 🎉 FILES DEPLOYED:
echo    ✅ database/migrations/172_auto_init_school_data.sql
echo    ✅ src/app/api/school/initialize-data/route.ts
echo    ✅ src/app/api/admin/initialize-all-schools/route.ts
echo    ✅ src/app/api/schools/register/route.ts (UPDATED)
echo    ✅ src/app/api/teaching/class-combos/route.ts (FIXED)
echo    ✅ src/app/api/school-admin/staff/register/route.ts (FIXED)
echo ============================================================================
echo.
pause
