@echo off
REM Quick deployment script
echo.
echo ============================================================================
echo 🚀 DEPLOYING FIXES TO VERCEL
echo ============================================================================
echo.

cd /d c:\Users\OLU\Desktop\SMS

echo [1/3] Staging changes...
git add -A

echo [2/3] Committing...
git commit -m "Fix: Results page Supabase integration - All School Admin features complete"

echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo ============================================================================
echo ✅ DEPLOYMENT COMPLETE
echo ============================================================================
echo.
echo Vercel will automatically build and deploy within 5-10 minutes
echo Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta
echo.
pause
