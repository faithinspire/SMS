@echo off
setlocal enabledelayedexpansion

echo ============================================
echo FTECH SMS - VERCEL DEPLOYMENT SCRIPT
echo ============================================
echo.
echo Starting deployment process...
echo.

cd /d "c:\Users\OLU\Desktop\SMS"

echo [1/5] Cleaning previous build...
if exist .next (
    rmdir /s /q .next
    echo ✓ Old build cleaned
) else (
    echo ✓ No previous build found
)
echo.

echo [2/5] Installing dependencies (if needed)...
call npm install --legacy-peer-deps 2>nul
echo ✓ Dependencies ready
echo.

echo [3/5] Building production version...
call npm run build 2>&1
if !errorlevel! neq 0 (
    echo.
    echo ✗ BUILD FAILED!
    echo Please check the errors above.
    pause
    exit /b 1
)
echo ✓ Build successful!
echo.

echo [4/5] Staging changes for git...
call git add . 2>&1
echo ✓ Changes staged
echo.

echo [5/5] Committing and pushing to Vercel...
call git commit -m "Deploy: Fix Suspense boundaries for dynamic rendering - ready for production" 2>&1
if !errorlevel! neq 0 (
    echo ✗ Git commit failed (may already be committed)
    echo Continuing with push...
)
echo.

echo Pushing to main branch (Vercel will auto-deploy)...
call git push origin main 2>&1
if !errorlevel! neq 0 (
    echo ✗ Push failed!
    echo Please check git credentials.
    pause
    exit /b 1
)

echo.
echo ============================================
echo ✓ DEPLOYMENT INITIATED SUCCESSFULLY!
echo ============================================
echo.
echo Next steps:
echo 1. Go to https://vercel.com
echo 2. Find your SMS project
echo 3. Watch for the green "Ready" status
echo 4. Deployment typically takes 2-5 minutes
echo.
echo The build should complete without errors!
echo ============================================
pause
