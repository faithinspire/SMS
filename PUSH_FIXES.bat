@echo off
REM Commit and push all SMS fixes to GitHub

cd c:\Users\OLU\Desktop\SMS

echo ========================================
echo Adding migration files...
echo ========================================
git add database/migrations/161_ensure_unique_constraints.sql
git add database/migrations/162_fix_on_conflict_academic_tables.sql
git add database/migrations/163_fix_academic_sessions_end_year.sql

echo.
echo ========================================
echo Committing changes...
echo ========================================
git commit -m "fix: resolve 42P10 ON CONFLICT error - remove triggers, add UNIQUE constraints, fix end_year"

echo.
echo ========================================
echo Pushing to GitHub...
echo ========================================
git push origin main

echo.
echo ========================================
echo Done! Check Vercel for auto-deployment
echo ========================================
pause
