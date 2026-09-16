@echo off
cd /d "c:\Users\OLU\Desktop\SMS"
echo Pushing to Vercel...
git push -u origin main
if %errorlevel% neq 0 (
    echo Push failed with error code %errorlevel%
    exit /b 1
)
echo Push successful!
pause
