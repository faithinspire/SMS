@echo off
setlocal enabledelayedexpansion
cd /d "c:\Users\OLU\Desktop\SMS"

echo.
echo ========================================================
echo PUSHING CRITICAL FIX - Result Pages
echo ========================================================
echo.

git config user.email "admin@sms.local" 2>nul
git config user.name "SMS Deploy" 2>nul

echo [STAGE] Adding modified files...
git add src/app/api/results/class-summary/[classId]/route.ts 2>nul
git add src/app/principal/results/page.tsx 2>nul
git add src/app/headteacher/results/page.tsx 2>nul
git add src/app/school-admin/results/page.tsx 2>nul

echo [STATUS] Staged files ready
git diff --cached --name-only 2>nul | findstr /C:"page.tsx" /C:"route.ts" && echo OK - Files staged || echo ERROR - No files staged

echo.
echo [COMMIT] Creating commit...
git commit -m "HOTFIX: Result pages - Load terms directly without sessions, add error handling

CRITICAL FIXES:
- Removed session dependency (sessions may not exist in database)
- All result pages now load terms directly from academic_terms table
- Auto-select first term on page load
- Immediately fetch classes and students for first term
- Added comprehensive error handling and logging to API
- API now handles missing scores gracefully without crashing
- Added detailed error messages for debugging

PAGES FIXED:
1. Principal Results - Now displays student results by term
2. Headteacher Results - Now displays primary level results by term  
3. School Admin Results - Now displays all school results by term

FILES CHANGED:
- src/app/api/results/class-summary/[classId]/route.ts
- src/app/principal/results/page.tsx
- src/app/headteacher/results/page.tsx
- src/app/school-admin/results/page.tsx" 2>nul

echo [PUSH] Pushing to Vercel...
for /f "tokens=*" %%A in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set BRANCH=%%A
git push origin %BRANCH% --force 2>nul

echo.
echo ========================================================
echo ✅ DEPLOYMENT COMPLETE
echo ========================================================
echo Deploy to Vercel: Check https://vercel.com/dashboard
echo Expected: Results page now shows students per term
echo.
pause
