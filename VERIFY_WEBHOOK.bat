@echo off
REM Vercel GitHub Webhook Verification Script
REM This script tests if the webhook is working by pushing a test commit

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     VERCEL GITHUB WEBHOOK VERIFICATION SCRIPT             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d c:\Users\OLU\Desktop\SMS

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Git detected
echo.

REM Get current branch
for /f "tokens=*" %%A in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%A
echo Current branch: %CURRENT_BRANCH%
echo.

REM Get latest commit hash
for /f "tokens=*" %%A in ('git rev-parse --short HEAD') do set COMMIT_HASH=%%A
echo Latest commit: %COMMIT_HASH%
echo.

REM Create test file
echo Testing Vercel webhook at %date% %time% > WEBHOOK_TEST_%RANDOM%.txt

REM Add, commit, and push
echo Adding test file...
git add WEBHOOK_TEST_*.txt
if errorlevel 1 goto error

echo Creating test commit...
git commit -m "Test: Webhook verification - !COMMIT_HASH! - !date!"
if errorlevel 1 goto error

echo Pushing to GitHub...
git push origin %CURRENT_BRANCH%
if errorlevel 1 goto error

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║            ✅ PUSH SUCCESSFUL                             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📊 Next Steps:
echo.
echo 1. Open Vercel Dashboard:
echo    https://vercel.com/dashboard/projects/sms
echo.
echo 2. Watch for a new build to start (within 30 seconds)
echo.
echo 3. Expected timeline:
echo    + 30 sec:  Webhook fires, build starts
echo    + 1-2 min: Build completes
echo    + 5-7 min: Deploy live to production
echo.
echo 4. Verify at:
echo    https://sms-gold-eta.vercel.app
echo.
echo ⏱️  You can close this window now.
echo.
pause
exit /b 0

:error
echo.
echo ❌ ERROR during git operations
echo Please check your git configuration
pause
exit /b 1
