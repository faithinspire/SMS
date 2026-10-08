@echo off
cd c:\Users\OLU\Desktop\SMS

echo ===================================
echo Git: Adding all changes...
echo ===================================
git add -A

echo.
echo ===================================
echo Git: Committing...
echo ===================================
git commit -m "Feat: Add student subjects API and integrate View modal in Students Management page"

echo.
echo ===================================
echo Git: Pushing to main...
echo ===================================
git push -u origin main

echo.
echo ===================================
echo Vercel: Triggering deployment...
echo ===================================
vercel --prod

echo.
echo ===================================
echo DEPLOYMENT COMPLETE!
echo ===================================
pause
