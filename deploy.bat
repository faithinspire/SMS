@echo off
REM Deployment script for FTECH SMS

echo ========================================
echo FTECH SMS - Production Deployment
echo ========================================
echo.

cd /d "c:\Users\OLU\Desktop\SMS"

echo [1/4] Checking git status...
git status

echo.
echo [2/4] Adding all changes...
git add -A

echo.
echo [3/4] Committing changes...
git commit -m "Production fixes: school persistence, staff payments, admission letters, school fees - FINAL DEPLOYMENT"

echo.
echo [4/4] Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Vercel will automatically deploy the latest changes.
echo Monitor deployment at: https://vercel.com/faithinspire
echo.
pause
