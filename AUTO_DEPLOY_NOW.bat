@echo off
REM Auto Deploy with Vercel Secrets Configured

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   AUTO COMMIT ^& DEPLOY - VERCEL SECRETS CONFIGURED       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d c:\Users\OLU\Desktop\SMS

REM Create deployment marker file
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set timestamp=%mydate%_%mytime%

echo Creating deployment trigger file...
echo Vercel secrets configured at %date% %time% > DEPLOYMENT_SECRETS_CONFIGURED_%timestamp%.txt

REM Stage the file
echo.
echo Adding to git...
git add DEPLOYMENT_SECRETS_CONFIGURED_%timestamp%.txt
if errorlevel 1 goto error

REM Create commit
echo Creating commit...
git commit -m "🚀 Deploy: Vercel environment secrets configured - All 7 fixes ready"
if errorlevel 1 goto error

REM Push to GitHub
echo.
echo Pushing to GitHub main branch...
git push origin main
if errorlevel 1 goto error

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║           ✅ DEPLOYMENT TRIGGERED SUCCESSFULLY           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🔍 What's happening now:
echo    1. GitHub receives your commit
echo    2. Webhook fires to Vercel (within 10 seconds)
echo    3. Vercel reads your secrets from environment
echo    4. Build starts with dashboard fixes
echo    5. Build completes and deploys
echo.
echo 📊 Monitor deployment progress:
echo.
echo    Vercel Dashboard:
echo    https://vercel.com/dashboard/projects/sms/deployments
echo.
echo    Live Application:
echo    https://sms-gold-eta.vercel.app/school-admin/dashboard
echo.
echo ⏱️ Expected timeline:
echo    Now:      Commit pushed to GitHub
echo    +30 sec:  Webhook fires, build starts
echo    +1 min:   Build in progress
echo    +3 min:   Build completes
echo    +1 min:   Deploy to CDN
echo    +5-7 min: 🎉 LIVE ON PRODUCTION
echo.
echo ✅ Your 7 dashboard fixes are now deploying:
echo    • Dashboard loads instantly (useEffect fix)
echo    • Data fetches in parallel (Promise.all)
echo    • Real-time navbar updates (Supabase subscriptions)
echo    • And 4 more critical fixes
echo.
echo Press any key to close this window
pause >nul
exit /b 0

:error
echo.
echo ❌ ERROR during deployment
pause
exit /b 1
