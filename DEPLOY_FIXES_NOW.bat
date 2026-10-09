@echo off
REM ==========================================================
REM 🚀 DEPLOY CRITICAL FIXES TO VERCEL
REM ==========================================================
REM Commits and pushes all fixes to GitHub
REM Vercel automatically deploys on push

echo.
echo ==========================================================
echo 🚀 DEPLOYING CRITICAL FIXES TO VERCEL
echo ==========================================================
echo.

cd /d "%~dp0"

echo [1/4] Staging all changes...
git add -A
if errorlevel 1 echo ❌ Failed to stage changes & goto :error

echo ✅ Changes staged

echo.
echo [2/4] Committing fixes...
git commit -m "fix: resolve staff registration errors - fix API query, add all staff categories, add teacher class/subject assignment"
if errorlevel 1 echo ⚠️ Nothing to commit or error & exit /b 0

echo ✅ Commit created

echo.
echo [3/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
  echo ❌ Push failed
  echo Please check your git credentials
  goto :error
)

echo ✅ Pushed to GitHub

echo.
echo [4/4] Vercel deployment initiated...

echo.
echo ==========================================================
echo ✅ DEPLOYMENT PIPELINE ACTIVATED
echo ==========================================================
echo.
echo 📍 What happens next:
echo    1. GitHub receives your push
echo    2. Vercel receives webhook notification
echo    3. Build starts (2-3 minutes)
echo    4. Tests run
echo    5. Deploy to production
echo.
echo 🔍 Monitor at:
echo    https://vercel.com/dashboard/projects/sms-gold-eta
echo.
echo 🌐 Live at:
echo    https://sms-gold-eta.vercel.app
echo.
echo ✨ FIXED IN THIS DEPLOYMENT:
echo    ✓ Staff profile view API error (400 status)
echo    ✓ Added all staff categories (Principal, Headteacher, Accountant)
echo    ✓ Added teacher class/subject assignment (Step 5)
echo.
echo ⏱️ Expected timeline:
echo    NOW     - Push to GitHub
echo    +1 min  - Vercel receives notification
echo    +3 min  - Build starts
echo    +5 min  - Build completes
echo    +7 min  - ✅ LIVE
echo.
pause
exit /b 0

:error
echo.
echo ❌ DEPLOYMENT FAILED
echo.
echo Troubleshooting:
echo   • Check git is configured: git config --list
echo   • Verify GitHub credentials are saved
echo   • Try pushing manually: git push origin main
echo.
pause
exit /b 1
