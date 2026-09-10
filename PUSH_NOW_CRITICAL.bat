@echo off
REM CRITICAL - Push the fixed vercel.json RIGHT NOW
REM This will fix the deployment that's currently failing

echo ========================================
echo CRITICAL FIX - Pushing Fixed vercel.json
echo ========================================
echo.

cd /d "c:\Users\OLU\Desktop\SMS"
echo Current directory: %cd%
echo.

echo [STEP 1] Staging vercel.json fix...
git add vercel.json
echo Fixed file staged ✓
echo.

echo [STEP 2] Committing fix...
git commit -m "URGENT fix: remove regions and functions from vercel.json - fixing deployment error"
echo Committed ✓
echo.

echo [STEP 3] Pushing to GitHub immediately...
git push -u origin main
echo Pushed ✓
echo.

echo ========================================
echo ✓ CRITICAL FIX PUSHED!
echo ========================================
echo.
echo Vercel will see this push and auto-redeploy
echo Your deployment will now SUCCEED!
echo.
echo Check https://vercel.com/dashboard
echo Status should change to "Building..." then "Ready ✓"
echo.
pause
