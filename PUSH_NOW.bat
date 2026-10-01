@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo [1] Checking git status...
git status

echo.
echo [2] Adding all changes...
git add -A

echo.
echo [3] Committing fixes...
git commit -m "fix: UUID generation for staff registration, add letter generation buttons to admin dashboard"

echo.
echo [4] Pushing to main...
git push origin main

echo.
echo [5] Done! Check https://vercel.com/dashboard/sms for deployment
pause
