@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo 🚀 VERCEL DIRECT DEPLOYMENT
echo ============================================================================
echo.

cd /d c:\Users\OLU\Desktop\SMS

echo Step 1: Deploy to production via Vercel CLI...
echo.

REM Try to use npx vercel directly with OIDC token
for /f "tokens=*" %%A in (.env.local) do (
    if "%%A" neq "" (
        set "%%A"
    )
)

echo Using VERCEL_OIDC_TOKEN for authentication...
echo.

REM Deploy to production
npx vercel deploy --prod --token "%VERCEL_OIDC_TOKEN%" --yes

if errorlevel 1 (
    echo.
    echo ⚠️ npx vercel failed, trying alternative deployment method...
    echo.
    
    REM Try running the Node.js script directly
    node deploy-vercel-direct.js
    
    if errorlevel 1 (
        echo.
        echo ❌ Deployment failed
        pause
        exit /b 1
    )
)

echo.
echo ============================================================================
echo ✅ DEPLOYMENT INITIATED
echo ============================================================================
echo.
echo 📍 Monitor: https://vercel.com/dashboard/projects/sms-gold-eta
echo 🌍 Live: https://sms-gold-eta.vercel.app
echo.
pause
