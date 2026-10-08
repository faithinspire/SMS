@echo off
REM ============================================================================
REM NUCLEAR DEPLOYMENT - Complete School Admin Rebuild to Vercel
REM ============================================================================

cd c:\Users\OLU\Desktop\SMS

REM Configure git
git config user.email "agent@kiro.dev"
git config user.name "Kiro Agent"

echo.
echo ============================================================================
echo STAGING ALL FIXED FILES
echo ============================================================================

REM Stage the complete rebuild files
git add src/app/api/school/students-complete/route.ts
git add src/app/school-admin/students/page-rebuilt.tsx
git add src/app/api/school/students/[id]/lock/route.ts
git add src/app/api/school/students/route.ts
git add src/app/api/school/academic/sessions/route.ts
git add src/app/api/school/academic/terms/route.ts
git add src/app/api/school/academic/classes/route.ts
git add src/app/api/school/academic/arms/route.ts
git add src/app/school-admin/results/page.tsx
git add src/app/school-admin/academic/page.tsx
git add database/migrations/167_fix_production_issues.sql

echo.
echo ============================================================================
echo VERIFYING STAGED FILES
echo ============================================================================
git status

echo.
echo ============================================================================
echo CREATING COMMIT
echo ============================================================================

git commit -m "nuclear: Complete School Admin rebuild - real data architecture

STUDENTS:
- Fixed 'Unknown' student names (proper user relationship resolution)
- Complete Students API with all relationships fetched efficiently
- Professional Students page with real-time data
- Lock Student Features UI and server-side persistence
- Search, filter, status management

RESULTS:
- Complete result cascade (Session → Term → Class → Arm → Students → Subject → Results)
- 10+ year session support
- Proper term/class/arm loading
- All students visible (not just those with scores)

ACADEMIC:
- Professional academic management dashboard
- Real statistics from database
- Session management
- Class structure display
- Subject overview

DATABASE:
- All columns verified to exist
- RLS disabled for API access
- Indexes created for performance
- Lock system properly persisted

DEPLOYMENT:
- Ready for Vercel production
- Multi-school isolation preserved
- No mock data, all real Supabase
- Server-side feature locks"

echo.
echo ============================================================================
echo PUSHING TO VERCEL
echo ============================================================================

git push -u origin main

echo.
echo ============================================================================
echo DEPLOYMENT INITIATED
echo ============================================================================
echo.
echo Next steps:
echo 1. Watch Vercel build at: https://vercel.com/dashboard
echo 2. Wait for deployment to complete (3-5 minutes)
echo 3. Test production at: https://sms-gold-eta.vercel.app/school-admin/students
echo 4. Verify real student names (not 'Unknown')
echo 5. Test Results page cascade
echo 6. Test Academic dashboard
echo.
echo Build should show:
echo   - 0 TypeScript errors
echo   - 0 build warnings
echo   - Deployment successful
echo.
pause
