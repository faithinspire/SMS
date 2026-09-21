@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo ===================================================
echo 🚀 PUSHING MIGRATION 121 TO VERCEL
echo ===================================================
echo.
echo Your branch is 1 commit ahead of origin/main
echo Commit: FIX: Disable RLS on result tables...
echo.

echo Pushing to main branch...
git push origin main

echo.
echo ===================================================
if errorlevel 0 (
    echo ✅ SUCCESS! Migration pushed to Vercel
    echo.
    echo 📋 What happens next:
    echo 1. Vercel detects new commit (5-10 sec)
    echo 2. Vercel rebuilds and deploys (1-2 min)
    echo 3. Migration 121 runs automatically
    echo 4. RLS disabled on result tables
    echo 5. Classes and students NOW load with scores
    echo.
    echo 🎯 Result: Sessions, Terms, Classes, and Students appear
    echo.
    echo ⏱️  Total time: 5-10 minutes
) else (
    echo ❌ Push failed
)
echo ===================================================
pause
