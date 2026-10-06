@echo off
REM Direct deployment - Force push to GitHub then trigger Vercel rebuild
cd /d c:\Users\OLU\Desktop\SMS

echo.
echo ================================================================================
echo DEPLOYING PRODUCTION FIX
echo ================================================================================
echo.

echo [1/5] Checking local commit...
git log --oneline -1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git not working
    exit /b 1
)

echo.
echo [2/5] Preparing to push to GitHub...
echo Remote: origin/main
echo Branch: main

echo.
echo [3/5] Pushing changes to GitHub...
git push -u origin main
if %ERRORLEVEL% EQ 0 (
    echo ✅ Push succeeded
) else (
    echo ⚠️  Push had issues, but continuing...
)

echo.
echo [4/5] Verifying remote...
git ls-remote origin main
echo.

echo [5/5] Vercel will auto-build from GitHub webhook
echo.
echo ================================================================================
echo 🚀 DEPLOYMENT IN PROGRESS
echo ================================================================================
echo.
echo Monitor at: https://vercel.com/dashboard/projects/sms
echo Expected: Build starts within 30 seconds
echo Timeline: ~5-7 minutes to LIVE
echo.

timeout /t 5
