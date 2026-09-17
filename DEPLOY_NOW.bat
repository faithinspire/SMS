@echo off
cd /d "c:\Users\OLU\Desktop\SMS"

echo ========================================
echo Deploying Result Pages Fix to Vercel
echo ========================================
echo.

echo [1/6] Configuring git...
git config user.email "sms-deploy@example.com"
git config user.name "SMS Deployment Bot"

echo [2/6] Staging all modified files...
git add src/app/api/results/student/[studentId]/route.ts
git add src/app/teacher/results/[studentId]/page.tsx
git add src/app/principal/results/page.tsx
git add src/app/headteacher/results/page.tsx
git add src/app/school-admin/results/page.tsx
git add "00_RESULT_PAGES_FIX_COMPLETE.md"

echo [3/6] Checking staged files...
git diff --cached --name-only

echo [4/6] Creating commit...
git commit -m "CRITICAL FIX: Result pages - Proper session/term loading and student display

FIXED ISSUES:
- Principal/Headteacher/Admin pages now properly fetch sessions before terms
- All result pages now load students and display results for selected term
- Added immediate class loading on initial page load with first available term
- Fixed term dropdown to properly trigger class and student loading

CHANGES:
1. src/app/api/results/student/[studentId]/route.ts - Enhanced with school/class info
2. src/app/teacher/results/[studentId]/page.tsx - Display school branding
3. src/app/principal/results/page.tsx - FIXED: proper session/term/class loading
4. src/app/headteacher/results/page.tsx - FIXED: proper session/term/class loading  
5. src/app/school-admin/results/page.tsx - FIXED: proper session/term/class loading

TECHNICAL FIXES:
- Load academic_sessions first, then fetch academic_terms for those sessions
- Call loadClassesForTermImmediate on initial load with first term
- Auto-select first class when classes load
- Proper API calls with termId parameter to /api/results/class-summary
- Cache busting with timestamp parameter on API calls"

echo [5/6] Getting current branch...
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i
echo Current branch: %BRANCH%

echo [6/6] Pushing to Vercel with force...
git push origin %BRANCH% --force

echo.
echo ========================================
echo ✅ Deployment Complete!
echo ========================================
echo Check Vercel deployment at: https://vercel.com/dashboard
echo.
pause
