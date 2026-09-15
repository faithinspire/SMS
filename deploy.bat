@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo ========================================
echo Force Deploying to Vercel
echo ========================================

echo.
echo Step 1: Stage all changes
git add -A
if errorlevel 1 (
    echo ERROR: git add failed
    pause
    exit /b 1
)

echo.
echo Step 2: Commit changes
git commit -m "fix: teacher registration nested field queries and student results auto-loading"
if errorlevel 1 (
    echo ERROR: git commit failed
    echo Trying with --allow-empty flag
    git commit -m "fix: teacher registration nested field queries" --allow-empty
)

echo.
echo Step 3: Force push to GitHub
git push -f origin main
if errorlevel 1 (
    echo ERROR: git push failed
    echo Trying normal push
    git push origin main
)

echo.
echo ========================================
echo Deploy Initiated!
echo ========================================
echo.
echo What to do next:
echo 1. Wait 5-10 minutes for Vercel to build
echo 2. Check https://vercel.com/dashboard
echo 3. Hard refresh browser: Ctrl+Shift+R
echo 4. Test teacher registration Step 4
echo 5. Test student results page
echo.
pause
