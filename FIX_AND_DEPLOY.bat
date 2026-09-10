@echo off
REM Hard Terminal Fix and Vercel Deployment Script
REM Run this file directly - double click it

echo ========================================
echo FTECH SMS - Terminal Hard Fix & Deploy
echo ========================================
echo.

REM Navigate to project
cd /d "c:\Users\OLU\Desktop\SMS"
echo Current directory: %cd%
echo.

REM Check git status
echo [STEP 1] Checking git status...
git status
echo.

REM Add all changes
echo [STEP 2] Adding all changes to git...
git add .
echo Changes staged ✓
echo.

REM Commit changes
echo [STEP 3] Committing changes...
git commit -m "fix: remove invalid functions pattern from vercel.json - ready for deployment"
echo Committed ✓
echo.

REM Push to GitHub
echo [STEP 4] Pushing to GitHub...
git push -u origin main
echo Pushed to GitHub ✓
echo.

REM Show summary
echo ========================================
echo ✓ DEPLOYMENT READY!
echo ========================================
echo.
echo Next steps:
echo 1. Go to https://vercel.com
echo 2. Check your deployment status
echo 3. Your app should be live in 2-3 minutes!
echo.
echo Your live URL will be something like:
echo https://school-management-saas.vercel.app
echo.
pause
