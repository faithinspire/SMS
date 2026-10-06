@echo off
REM Deploy script for FTECH SMS - Commit and push to Vercel

echo.
echo ================================================================
echo FTECH SMS - DEPLOYMENT SCRIPT
echo ================================================================
echo.

cd /d c:\Users\OLU\Desktop\SMS

echo Step 1: Stage all changes...
git add -A
echo ✓ Staged

echo.
echo Step 2: Commit changes...
git commit -m "feat: student pause/unpause with server-side account lock enforcement"
echo ✓ Committed

echo.
echo Step 3: Push to GitHub...
git push origin main
echo ✓ Pushed

echo.
echo Step 4: Trigger Vercel deployment...
node vercel-direct-deploy.js

echo.
echo ================================================================
echo DEPLOYMENT COMPLETE
echo Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta
echo ================================================================
pause
