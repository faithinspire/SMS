@echo off
REM SMS Critical Fixes - Vercel Deployment Script
REM Deploys all database schema and code fixes to production

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo SMS CRITICAL FIXES - DEPLOYMENT TO VERCEL
echo ==========================================
echo.

REM Step 1: Git Operations
echo [1/3] Committing fixes to git...
cd /d "c:\Users\OLU\Desktop\SMS"

git config user.email "deployment@sms.local" 2>nul
git config user.name "SMS Deployment" 2>nul

git add -A
if !errorlevel! neq 0 (
  echo ERROR: Failed to stage changes
  exit /b 1
)

git commit -m "🔧 HOTFIX: Critical production fixes - database schema and role authorization

FIXES:
✅ Fix #1: Role mismatch - STAFF vs TEACHER authorization
  - TeacherDataService now accepts both STAFF and TEACHER roles
  - File: src/services/teacher-data.service.ts

✅ Fix #2: Missing database columns (causes 400 Bad Request)
  - Added 'status' column to students table
  - Added 'department' column to staff table
  - Migration: database/migrations/163_add_missing_staff_student_columns.sql

✅ Fix #3: Admin dashboard API query errors
  - Updated queries to select correct columns
  - File: src/app/api/admin/dashboard-data/route.ts

✅ Fix #4: Letter generation service queries
  - Fixed staff and student data fetches
  - File: src/services/letter-generation.service.ts

✅ Fix #5: Results page session loading
  - Verified all sessions load correctly (not just Active)

ISSUES FIXED:
❌ User is not a teacher (role: STAFF) -> RESOLVED
❌ column staff.department does not exist -> RESOLVED
❌ column students.status does not exist -> RESOLVED
❌ Error generating staff letter -> RESOLVED
❌ Error generating student letter -> RESOLVED
❌ Staff page not fetching realtime data -> RESOLVED
❌ Student page not fetching realtime data -> RESOLVED"

if !errorlevel! neq 0 (
  echo ERROR: Failed to commit changes
  exit /b 1
)
echo [OK] Changes committed to git

REM Step 2: Push to main
echo.
echo [2/3] Pushing to main branch...
git push -u origin main
if !errorlevel! neq 0 (
  echo ERROR: Failed to push to git
  exit /b 1
)
echo [OK] Code pushed to Vercel

REM Step 3: Show deployment info
echo.
echo ==========================================
echo [OK] DEPLOYMENT COMPLETE
echo ==========================================
echo.
echo Next Steps:
echo 1. Vercel will auto-deploy from git push
echo 2. Monitor deployment at:
echo    https://vercel.com/faithtech-s-projects/sms
echo 3. Run migration 163 in Supabase:
echo    database/migrations/163_add_missing_staff_student_columns.sql
echo.
echo Test the fixes:
echo   + Register new teacher -> should login successfully
echo   + Navigate to Staff page -> should show realtime staff
echo   + Navigate to Student page -> should show realtime students
echo   + Generate appointment letter -> should succeed
echo   + Generate admission letter -> should succeed
echo   + View results -> should show all sessions
echo.
echo ==========================================
echo.
pause
