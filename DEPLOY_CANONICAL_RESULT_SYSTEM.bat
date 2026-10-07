@echo off
REM Deployment script for Canonical Result System
REM This script commits and pushes the canonical result system to Vercel

cd /d c:\Users\OLU\Desktop\SMS

echo.
echo ========================================
echo Canonical Result System Deployment
echo ========================================
echo.

REM Check git status
echo [1/5] Checking git status...
git status

echo.
echo [2/5] Staging all changes...
git add -A

echo.
echo [3/5] Committing changes...
git commit -m "feat: Implement canonical result system with role-based aggregation APIs

- Add CanonicalResultService aggregating manual scores, CBT tests, CBT exams
- Create 5 new API endpoints for role-based result access:
  * /api/results/canonical (routing)
  * /api/teacher/results/canonical
  * /api/school-admin/results/canonical
  * /api/principal/results/canonical
  * /api/student/results/canonical
- Single source of truth for all result data
- Completes Teacher -> Result/CBT -> Canonical -> School Admin -> Principal -> Student flow
- Multi-tenant safe with school_id scoping
- Production-ready error handling"

echo.
echo [4/5] Pushing to main branch...
git push origin main

echo.
echo [5/5] Vercel deployment triggered...
echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo The canonical result system is now deployed to Vercel.
echo.
echo Endpoints available at:
echo   - https://sms.ftech.ai/api/results/canonical
echo   - https://sms.ftech.ai/api/teacher/results/canonical
echo   - https://sms.ftech.ai/api/school-admin/results/canonical
echo   - https://sms.ftech.ai/api/principal/results/canonical
echo   - https://sms.ftech.ai/api/student/results/canonical
echo.
echo Verify the deployment at: https://vercel.com/ftech-sms
echo.
pause
