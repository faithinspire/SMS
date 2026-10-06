@echo off
REM FTECH SMS Production Deployment
REM This script commits and pushes the dynamic route fixes to Vercel

cd /d c:\Users\OLU\Desktop\SMS

echo ===== FTECH SMS FINAL DEPLOYMENT =====
echo.
echo Step 1: Checking git status...
git status
echo.

echo Step 2: Staging changes...
git add -A
echo Added all changes to staging

echo.
echo Step 3: Committing changes...
git commit -m "fix: mark dynamic API routes to prevent Next.js static rendering errors

- Add 'export const dynamic = force-dynamic' to routes using cookies/searchParams
- Fixes DYNAMIC_SERVER_USAGE errors during production build
- Routes: admin/dashboard, teacher/dashboard, student/dashboard, results/get, cbt routes, school-admin/lessons/pending
- Preserves all authentication, multi-tenancy, and real data integration
- All School Admin features remain intact
- Deployment: https://vercel.com/dashboard/projects/sms"

echo.
echo Step 4: Pushing to GitHub main branch...
git push origin main

echo.
echo ===== DEPLOYMENT STARTED =====
echo.
echo Vercel webhook will trigger automatically.
echo Monitor deployment at: https://vercel.com/dashboard/projects/sms
echo.
echo Expected timeline:
echo - Build starts: 1-2 minutes after push
echo - Build completes: 5-10 minutes
echo - Deployment status: Ready
echo.
echo Test at: https://sms-gold-eta.vercel.app
echo.
pause
