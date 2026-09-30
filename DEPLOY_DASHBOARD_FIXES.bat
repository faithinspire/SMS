@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo  SMS Dashboard Fixes - Deployment Script
echo ============================================================================
echo.

REM Navigate to repository
echo [1/5] Navigating to repository...
cd /d c:\Users\OLU\Desktop\SMS
if errorlevel 1 (
    echo ERROR: Could not navigate to repository
    pause
    exit /b 1
)
echo OK - Repository found
echo.

REM Check git status
echo [2/5] Checking git status...
git status --short > nul 2>&1
if errorlevel 1 (
    echo WARNING: Git may not be working correctly
) else (
    echo OK - Git is working
)
echo.

REM Stage changes
echo [3/5] Staging all changes...
git add .
if errorlevel 1 (
    echo ERROR: Failed to stage changes
    pause
    exit /b 1
)
echo OK - Changes staged
echo.

REM Commit
echo [4/5] Creating commit...
git commit -m "Professional fix: Resolve staff/students infinite loading, missing database columns, empty dropdowns with graceful error handling (AbortController pattern, Schema migration 147, Timeout protection)"
if errorlevel 1 (
    echo WARNING: Commit may have failed or nothing to commit
)
echo.

REM Push to GitHub
echo [5/5] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo ERROR: Failed to push to GitHub
    echo.
    echo This could be because:
    echo   1. GitHub credentials not cached
    echo   2. Network connection issue
    echo   3. Permission denied
    echo.
    echo Try:
    echo   - git config user.name "Your Name"
    echo   - git config user.email "your@email.com"
    echo   - gh auth login (if using GitHub CLI)
    pause
    exit /b 1
)
echo.

REM Success
echo ============================================================================
echo OK - DEPLOYMENT INITIATED
echo ============================================================================
echo.
echo Status:
echo   * Code pushed to GitHub (main branch)
echo   * Vercel webhook triggered (automatic)
echo   * Build starting on Vercel
echo.
echo Next Steps:
echo   1. Monitor Vercel: https://vercel.com/dashboard/projects/sms-gold-eta
echo   2. Run SQL migration in Supabase
echo      - Open DASHBOARD_FIXES_DEPLOYMENT.md for SQL commands
echo      - Go to Supabase SQL Editor
echo      - Copy and paste the migration SQL
echo   3. Test pages after deployment (~5-10 minutes)
echo.
echo Timeline:
echo   NOW:      Code pushed to GitHub
echo   +30 sec:  Vercel detects push
echo   +1 min:   Vercel starts building
echo   +5 min:   Build completes
echo   +5-10min: LIVE on Vercel
echo.
echo Important:
echo   * Don't forget to run the SQL migration in Supabase!
echo   * Read DASHBOARD_FIXES_DEPLOYMENT.md for complete instructions
echo.
pause
