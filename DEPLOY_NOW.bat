@echo off
REM Deploy to Vercel - Super Simple Script
REM This script deploys your SMS project to production on Vercel

echo.
echo ==========================================
echo  FTECH SMS - Deploy to Vercel
echo ==========================================
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Vercel CLI globally...
    call npm install -g vercel
    echo.
)

REM Check if git is clean
git status --porcelain
if %errorlevel% equ 0 (
    echo.
    echo Do you want to commit changes before deploying?
    echo Current git status shown above.
    echo.
)

REM Deploy to production
echo.
echo Deploying to Vercel production...
echo.
call vercel --prod --yes

echo.
echo ==========================================
echo  ✅ Deployment Complete!
echo ==========================================
echo.
echo Your app is now live!
echo Check: https://vercel.com/dashboard
echo.
pause
