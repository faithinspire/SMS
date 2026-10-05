@echo off
REM Deploy 3 critical fixes to Vercel
REM Fixes: Staff Edit Modal, Results Session, Staff/Student data fetching

cd /d c:\Users\OLU\Desktop\SMS

echo.
echo ================================================================================
echo DEPLOYING 3 CRITICAL FIXES TO VERCEL
echo ================================================================================
echo.

REM Add the fixed files
echo [1/4] Staging modified files...
git add src/app/school-admin/staff/page.tsx
git add src/app/school-admin/students/page.tsx
git add src/app/school-admin/results/page.tsx
echo ✓ Files staged
echo.

REM Show what will be committed
echo [2/4] Files ready to commit:
git diff --cached --name-only
echo.

REM Commit with comprehensive message
echo [3/4] Creating commit...
git commit -m "Fix: Resolve three critical issues - Staff Edit Modal, Results Session display, Staff/Student data fetching

FIXES:
- Fix #1: Rebuild Staff Edit Modal with complete profile editor (8 sections)
- Fix #2: Fix Results Session dropdown showing actual sessions not 'ACTIVE'
- Fix #3: Fix Staff/Student pages not fetching school records

DETAILS:
Fix #1: Staff Edit Modal Complete Profile Editor
  * 8 complete sections: Personal, Contact, Employment, Academic, Class Assignment, Subject Assignment, Salary, Account
  * Modal loads lookup data (sessions, classes, subjects) from database
  * Modal loads complete staff record before opening
  * All changes persist to database on save
  * File: src/app/school-admin/staff/page.tsx

Fix #2: Results Session Page Shows Actual Sessions
  * Enhanced loadSessions() with strict validation
  * Sessions display as '2026/2027' instead of 'ACTIVE'
  * Clear error messages when no sessions found
  * Proper session_year extraction and display
  * File: src/app/school-admin/results/page.tsx

Fix #3: Staff/Student Pages Now Fetch School Records
  * Replaced .single() with .maybeSingle() in user profile queries
  * Safe school_id resolution prevents PGRST116 errors
  * Staff page fetches and displays all school staff
  * Students page fetches and displays all school students
  * Files: src/app/school-admin/staff/page.tsx, src/app/school-admin/students/page.tsx

IMPACT:
- Teachers/staff can edit complete profile including subjects and classes
- Results pages show correct session years
- Staff and student records load from database reliably
- No PGRST116 errors
- No silent failures with empty data

VERIFICATION:
- All fixes tested locally
- No breaking changes
- API contracts unchanged
- Database unchanged
- Ready for production"

if %ERRORLEVEL% NEQ 0 (
  echo ✗ Commit failed
  exit /b 1
)
echo ✓ Commit created
echo.

REM Push to GitHub
echo [4/4] Pushing to GitHub (triggers Vercel deployment)...
git push origin main

if %ERRORLEVEL% NEQ 0 (
  echo ✗ Push failed
  exit /b 1
)
echo ✓ Push successful
echo.

echo ================================================================================
echo ✅ DEPLOYMENT TO VERCEL INITIATED
echo ================================================================================
echo.
echo DEPLOYMENT TIMELINE:
echo   NOW:      Push to GitHub
echo   +10 sec:  Vercel receives webhook
echo   +30 sec:  Build starts
echo   +3-5 min: Build completes
echo   +5-7 min: LIVE ON PRODUCTION
echo.
echo LIVE URL: https://sms-gold-eta.vercel.app
echo Dashboard: https://sms-gold-eta.vercel.app/school-admin/dashboard
echo.
echo Monitor deployment at: https://vercel.com/dashboard/projects/sms-gold-eta
echo.
echo 🎉 All three critical fixes are now deploying to production!
echo.
pause
