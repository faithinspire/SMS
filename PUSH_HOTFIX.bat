@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo Staging fix...
git add src/app/api/superadmin/register-school/route.ts

echo Committing...
git commit -m "HOTFIX: remove ON CONFLICT, fix school registration 42P10 error"

echo Pushing to Vercel...
git push origin main

echo.
echo Done! Vercel will auto-deploy in ~5 minutes
echo Monitor at: https://vercel.com/dashboard/sms
pause
