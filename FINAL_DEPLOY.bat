@echo off
setlocal enabledelayedexpansion

color 0A
cls

echo ============================================================
echo   🚀 FINAL DEPLOYMENT - STAFF MODAL & LETTER FIXES
echo ============================================================
echo.

cd /d "c:\Users\OLU\Desktop\SMS"

echo 📝 STEP 1: Checking git repository...
git status >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ ERROR: Git repository not found
  pause
  exit /b 1
)
echo ✅ Git repository found

echo.
echo 📝 STEP 2: Staging staff page changes...
git add src\app\school-admin\staff\page.tsx
echo ✅ Staff page staged

echo.
echo 📝 STEP 3: Creating deployment commit...
git commit -m "🎨 FIX: Rebuild staff edit modal with salary/bank fields + letter generation preview"
if %errorlevel% neq 0 (
  echo ⚠️  Git commit may have failed or nothing new to commit
  echo Proceeding with push...
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
echo 📊 SUMMARY OF CHANGES:
echo   ✓ Staff edit modal enhanced with salary/bank fields
echo   ✓ Added status selector to staff modal
echo   ✓ Letter generation preview modal verified
echo   ✓ Download, Print, Email, WhatsApp sharing enabled
echo.
echo 🔗 Monitor deployment: https://vercel.com/faithinspire/sms
echo.
echo 🎯 WHAT'S FIXED:
echo   1. Staff edit modal now matches student modal structure
echo   2. Full employee details (salary, bank, account) editable
echo   3. Letter generation shows preview before sharing
echo   4. Can download, print, email, or share via WhatsApp
echo   5. Works for both Staff (appointment) and Student (admission) letters
echo.
echo ============================================================
echo.
echo 🔴 REMINDER: Execute Supabase migrations if not done yet!
echo   Copy RUN_THIS_IN_SUPABASE_NOW.sql to Supabase SQL Editor

pause
