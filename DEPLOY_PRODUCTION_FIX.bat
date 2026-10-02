@echo off
setlocal enabledelayedexpansion

color 0A
cls

echo ============================================================
echo   🚀 PRODUCTION DEPLOYMENT - CRITICAL HOTFIX
echo ============================================================
echo.

cd /d "c:\Users\OLU\Desktop\SMS"

echo 📝 STEP 1: Checking git repository...
git status >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ ERROR: Git repository not found or git not installed
  pause
  exit /b 1
)
echo ✅ Git repository found

echo.
echo 📝 STEP 2: Staging code fixes...
git add src\app\api\school\staff\route.ts
git add src\app\api\school\students\route.ts
git add src\services\teacher-data.service.ts
git add database\migrations\163_add_missing_staff_student_columns.sql
echo ✅ Files staged

echo.
echo 📝 STEP 3: Creating deployment commit...
git commit -m "🔥 PRODUCTION HOTFIX: Fix 6 critical issues - staff salary/bank columns, students status, SERVICE_ROLE_KEY, teacher-student linking"
if %errorlevel% neq 0 (
  echo ⚠️  Git commit failed - files may already be committed
)
echo ✅ Commit ready

echo.
echo 🚀 STEP 4: Pushing to GitHub (triggers Vercel auto-deploy)...
git push origin main
if %errorlevel% neq 0 (
  echo ❌ ERROR: Git push failed
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   ✅ DEPLOYMENT COMPLETE
echo ============================================================
echo.
echo 📊 SUMMARY:
echo   ✓ Code fixes staged from 4 files
echo   ✓ Deployment commit created
echo   ✓ Pushed to main branch (auto-deploy triggered)
echo.
echo 🔗 Monitor deployment: https://vercel.com/faithinspire/sms
echo.
echo 🔴 CRITICAL NEXT STEP:
echo   Execute Supabase migrations NOW!
echo   1. Go to https://supabase.com
echo   2. Select SMS project
echo   3. Click SQL Editor ^> New Query
echo   4. Copy-paste: c:\Users\OLU\Desktop\SMS\RUN_THIS_IN_SUPABASE_NOW.sql
echo   5. Click RUN
echo.
echo ============================================================

pause
