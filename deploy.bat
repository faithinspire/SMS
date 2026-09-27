@echo off
REM Force Git Commit and Push Script
REM Bypasses interactive prompts

cd /d "c:\Users\OLU\Desktop\SMS"

echo.
echo ========================================
echo School Admin Dashboard - Force Deploy
echo ========================================
echo.

REM Set git to use stored credentials
git config --global credential.helper wincred

echo [*] Adding file to staging...
git add "src/app/school-admin/dashboard/page.tsx"
if %ERRORLEVEL% NEQ 0 (
  echo [-] Failed to stage file
  exit /b 1
)
echo [+] File staged

echo.
echo [*] Creating commit...
git commit -m "ALL 7 FIXES: Letters, Edit, Delete, Results, Classes, Real-time Fees, Academic Tab"
if %ERRORLEVEL% NEQ 0 (
  echo [-] Failed to commit
  exit /b 1
)
echo [+] Commit created

echo.
echo [*] Pushing to GitHub...
git push origin main
if %ERRORLEVEL% NEQ 0 (
  echo [-] Failed to push
  exit /b 1
)
echo [+] Pushed to origin/main

echo.
echo ========================================
echo [SUCCESS] Deployment initiated!
echo ========================================
echo.
echo Vercel will auto-deploy in 3-5 minutes
echo Check: https://vercel.com/dashboard
echo.
pause
