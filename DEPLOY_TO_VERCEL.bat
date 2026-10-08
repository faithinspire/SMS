@echo off
REM Deploy to Vercel - School Admin Rebuild

cd c:\Users\OLU\Desktop\SMS

REM Configure git
git config user.email "agent@kiro.dev"
git config user.name "Kiro Agent"

REM Stage the 6 modified files
git add src/app/api/school/students/route.ts
git add src/app/api/school/academic/sessions/route.ts
git add src/app/api/school/academic/terms/route.ts
git add src/app/api/school/academic/classes/route.ts
git add src/app/api/school/academic/arms/route.ts
git add src/app/school-admin/results/page.tsx

REM Verify staging
git status

REM Create commit
git commit -m "fix: School Admin rebuild - fix APIs, column mapping, and error handling

- Fix Students API: remove auth cookie dependencies, use anon client
- Fix Sessions/Terms/Classes/Arms APIs: standardize response format
- Fix Terms API: map database columns (name->term_name, term_number->term_order)
- Improve Results page error handling and logging
- All queries scoped by school_id (multi-school safe)
- Ready for Vercel production deployment"

REM Push to main branch
git push -u origin main

echo.
echo ========================================
echo Deployment pushed to Git!
echo ========================================
echo Next: Watch Vercel build at https://vercel.com/dashboard
echo Build should complete in 3-5 minutes
echo ========================================
pause
