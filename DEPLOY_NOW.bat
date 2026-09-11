@echo off
REM SMS System - Force Deploy to Vercel Script
REM This script commits all changes and pushes to main branch for automatic Vercel deployment

echo.
echo ====================================================================
echo  SMS SYSTEM - FORCE DEPLOYMENT TO VERCEL
echo ====================================================================
echo.

cd /d c:\Users\OLU\Desktop\SMS

echo [1/4] Checking git status...
git status --short

echo.
echo [2/4] Adding all changes...
git add .

echo.
echo [3/4] Committing changes...
git commit -m "URGENT FIXES: Add student class to payments, auto WhatsApp sharing, fix navbar persistence, staff deletion, JSS subjects"

if errorlevel 1 (
    echo.
    echo WARNING: Commit failed or nothing to commit
    echo Trying to push anyway...
) else (
    echo Commit successful!
)

echo.
echo [4/4] Force pushing to main branch...
echo This will trigger automatic Vercel deployment
git push -u origin main --force

if errorlevel 0 (
    echo.
    echo ====================================================================
    echo  SUCCESS! Deployment started
    echo ====================================================================
    echo.
    echo Next steps:
    echo 1. Go to https://vercel.com/projects/school-management-saas
    echo 2. Wait for build to complete (watch for "Production" status)
    echo 3. Test at https://school-management-saas.vercel.app
    echo 4. Run migration in Supabase (see URGENT_DEPLOYMENT_NOW.md)
    echo.
) else (
    echo.
    echo ERROR: Push failed
    echo Please check git configuration and network connection
    echo.
)

pause
