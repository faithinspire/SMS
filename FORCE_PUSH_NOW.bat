@echo off
cd c:\Users\OLU\Desktop\SMS

echo Staging all changes...
git add -A

echo Creating commit...
git commit -m "CRITICAL FIX: Results page fetches ALL student subjects and scores - Fixed API to return all enrolled subjects - Fixed toast error - Returns pending status for subjects without scores - Includes all test/exam scores - Force deployed to Vercel"

echo Pushing to Vercel...
git push origin main --force

echo Done! Check Vercel dashboard for deployment.
pause
