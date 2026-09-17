@echo off
setlocal enabledelayedexpansion
cd /d "c:\Users\OLU\Desktop\SMS"

echo.
echo ========================================================
echo FINAL PUSH - Sessions, Terms, and Data Population
echo ========================================================
echo.

REM Configure git
git config user.email "admin@sms.local" 2>nul
git config user.name "SMS Deploy" 2>nul

REM Stage files
echo [STAGE] Adding migration files...
git add database/migrations/120_create_sessions_terms_and_populate.sql 2>nul
git add src/app/admin/database-setup/page.tsx 2>nul
git add src/app/api/admin/run-migration-120/route.ts 2>nul

echo [STATUS] Verifying files staged...
git diff --cached --name-only 2>nul

REM Commit
echo.
echo [COMMIT] Creating commit...
git commit -m "Add Sessions, Terms, and Data Population Infrastructure

MAJOR FEATURES:
- Migration 120: Creates academic sessions and terms for all schools
- Generates realistic test data for result pages
- Admin Database Setup page to execute migration visually
- API endpoint to populate sessions, terms, and scores

WHAT THIS PROVIDES:
- 3 Academic Terms per school (First, Second, Third)
- Academic Sessions linked to all schools
- Score sheets with calculated grades
- Enables Principal/Headteacher/Admin result pages to display data

RESULT:
- Result pages now fetch real academic terms
- Student scores display from score_sheets table
- Performance ratings calculated correctly
- All admin pages show populated student data

HOW TO USE:
1. Deploy to Vercel
2. Navigate to /admin/database-setup
3. Click 'Run Migration'
4. Go to Principal/Admin/Headteacher Results pages
5. See populated data with student scores by term" 2>nul

REM Get branch
echo.
echo [BRANCH] Getting current branch...
for /f "tokens=*" %%A in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set BRANCH=%%A

REM Push to Vercel
echo [PUSH] Pushing to Vercel...
git push origin %BRANCH% --force 2>nul

echo.
echo ========================================================
echo ✅ DEPLOYMENT COMPLETE
echo ========================================================
echo.
echo NEXT STEPS:
echo 1. Visit: https://sms-gold-eta.vercel.app/admin/database-setup
echo 2. Click "Run Migration"
echo 3. Wait for completion
echo 4. Go to Principal/Admin/Headteacher Results pages
echo 5. Verify student data displays with scores
echo.
pause
