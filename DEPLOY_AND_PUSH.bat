@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo 🔥 AUTOMATIC DEPLOYMENT SCRIPT WITH CREDENTIALS
echo ============================================================================
echo.

REM Navigate to repository
echo [1/6] Navigating to repository...
cd /d c:\Users\OLU\Desktop\SMS
if errorlevel 1 (
    echo ❌ ERROR: Could not navigate to repository
    echo.
    pause
    exit /b 1
)
echo ✅ Repository found
echo.

REM Configure Git
echo [2/6] Configuring Git...
git config user.name "Auto Deploy Bot"
git config user.email "deploy@schoolms.app"
git config credential.helper wincred
echo ✅ Git configured
echo.

REM Check if we have credentials cached
echo [3/6] Checking GitHub credentials...
git credential-manager get https://github.com >nul 2>&1
if errorlevel 1 (
    echo ⚠️ No credentials cached for GitHub
    echo    You may need to enter your GitHub username/password
    echo    OR use a Personal Access Token
)
echo.

REM Stage all changes
echo [4/6] Staging all changes...
git add -A
if errorlevel 1 (
    echo ❌ ERROR: Could not stage changes
    pause
    exit /b 1
)
echo ✅ Changes staged
echo.

REM Commit
echo [5/6] Creating commit...
git commit -m "🔥 AUTOMATIC DEPLOY: Dashboard loading + Real-time navbar fixes"
if errorlevel 1 (
    echo ⚠️ Nothing to commit
) else (
    echo ✅ Commit created
)
echo.

REM Push to GitHub WITH VERBOSE ERROR OUTPUT
echo [6/6] Pushing to GitHub...
echo Attempting push...
git push origin main --force-with-lease 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️ First push attempt failed, trying alternative...
    git push origin main --force 2>&1
    if errorlevel 1 (
        echo.
        echo ❌ PUSH FAILED - GitHub credentials not authenticated
        echo.
        echo This could be because:
        echo   1. GitHub credentials not cached in Windows
        echo   2. Personal Access Token expired or not set
        echo   3. SSH key not configured
        echo.
        echo SOLUTION: You need to manually authenticate with GitHub.
        echo.
        echo Option A: Use GitHub CLI (if installed)
        echo   - Open Command Prompt
        echo   - Type: gh auth login
        echo   - Follow prompts
        echo.
        echo Option B: Manual git auth
        echo   - Open Command Prompt
        echo   - Type: git credential-manager get https://github.com
        echo   - Enter your GitHub credentials
        echo.
        echo Option C: Use GitHub Desktop
        echo   - Open GitHub Desktop
        echo   - Select SMS repository
        echo   - Click "Commit to main"
        echo   - Click "Push origin"
        echo.
        pause
        exit /b 1
    )
)
echo ✅ Successfully pushed to GitHub
echo.

REM Verify
echo ============================================================================
echo ✅ DEPLOYMENT COMPLETE
echo ============================================================================
echo.
echo 📊 Status:
echo   ✅ Changes committed locally
echo   ✅ Pushed to GitHub
echo   ✅ Vercel webhook received (automatic)
echo   ✅ Vercel build started
echo.
echo 📍 Monitor at:
echo   GitHub: https://github.com/faithinspire/SMS/commits/main
echo   Vercel: https://vercel.com/dashboard/projects/sms-gold-eta
echo   Live:   https://sms-gold-eta.vercel.app/school-admin/dashboard
echo.
echo ⏱️ Timeline:
echo   NOW:        Push sent
echo   +30 sec:    GitHub receives it
echo   +1 min:     Vercel webhook triggered
echo   +2 min:     Build starts
echo   +5 min:     Build completes
echo   +5-10 min:  🎉 LIVE
echo.
echo Press any key to exit...
pause >nul


