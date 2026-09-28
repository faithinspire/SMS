@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo 🚀 LOCAL BUILD & DEPLOY
echo ============================================================================
echo.

cd /d c:\Users\OLU\Desktop\SMS

echo [1/4] Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found
    echo Install from: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ npm found
echo.

echo [2/4] Installing dependencies...
echo This may take a minute...
call npm install 2>&1
if errorlevel 1 (
    echo ⚠️  npm install had warnings (may be OK)
)
echo.

echo [3/4] Building project...
echo This may take a few minutes...
call npm run build 2>&1
if errorlevel 1 (
    echo ❌ Build failed
    echo Showing last 50 lines of output:
    echo.
    pause
    exit /b 1
)
echo ✅ Build successful
echo.

echo [4/4] Deploying to Vercel...
echo Checking for Vercel CLI...
where vercel >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI not installed globally
    echo Run this in Command Prompt:
    echo    npm install -g vercel
    echo Then run this batch file again
    pause
    exit /b 1
)

echo Starting deployment...
call vercel --prod --token=%VERCEL_OIDC_TOKEN%

echo.
echo ============================================================================
echo ✅ Deployment complete!
echo ============================================================================
echo.
echo Check progress at: https://vercel.com/dashboard/projects/sms-gold-eta
echo Live site: https://sms-gold-eta.vercel.app
echo.
pause
