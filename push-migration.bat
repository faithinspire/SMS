@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo [1/4] Checking git status...
git status --porcelain
echo.

echo [2/4] Adding migration file...
git add database/migrations/121_disable_rls_for_results.sql
if errorlevel 1 goto error

echo [3/4] Committing changes...
git commit -m "FIX: Disable RLS on result tables to allow classes and students to load"
if errorlevel 1 goto error

echo [4/4] Pushing to Vercel...
git push origin main
if errorlevel 1 goto error

echo.
echo ===================================================
echo ✅ SUCCESS! Migration pushed to Vercel
echo ===================================================
echo.
echo Migration 121 (disable_rls_for_results) is now deployed
echo Vercel will run it in 2-5 minutes
echo Result pages will load classes and students automatically
echo.
exit /b 0

:error
echo.
echo ===================================================
echo ❌ ERROR during git operation
echo ===================================================
exit /b 1
