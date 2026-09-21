@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo ===================================================
echo ✅ VERIFYING PUSH TO GITHUB/VERCEL
echo ===================================================
echo.

echo [1] Checking local git status...
git status -s
echo.

echo [2] Comparing with remote...
git log --oneline -3
git log --oneline origin/main -3
echo.

echo [3] Branch info...
git branch -vv
echo.

echo.
echo ===================================================
echo Migration Status Check
echo ===================================================
echo Checking if migration file exists in repo...
git ls-files | findstr "121_disable_rls"
echo.

echo Checking commit history...
git log --oneline --grep="RLS\|disable_rls" -5
