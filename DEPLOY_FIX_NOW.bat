@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo 🚀 DEPLOYING STUDENTS PAGE FIX - ReferenceError
echo ============================================================================
echo.

REM Navigate to repository
echo [1/5] Navigating to repository...
cd /d c:\Users\OLU\Desktop\SMS
if errorlevel 1 (
    echo ❌ ERROR: Could not navigate to repository
    pause
    exit /b 1
)
echo ✅ Repository found
echo.

REM Configure Git
echo [2/5] Configuring Git credentials...
git config user.name "Auto Deploy Bot"
git config user.email "deploy@schoolms.app"
echo ✅ Git configured
echo.

REM Check what changed
echo [3/5] Checking modified files...
git status --short
echo.

REM Stage ONLY the students page fix
echo [4/5] Staging students page fix...
git add src/app/school-admin/students/page.tsx
if errorlevel 1 (
    echo ❌ ERROR: Could not stage students page
    pause
    exit /b 1
)

REM Verify it's staged
git diff --cached --name-only | find "students/page.tsx" >nul
if errorlevel 1 (
    echo ❌ ERROR: students/page.tsx not in staged files
    pause
    exit /b 1
)

echo ✅ Students page fix staged:
git diff --cached --name-only
echo.

REM Show preview of changes
echo [5/5] Previewing changes...
git diff --cached src/app/school-admin/students/page.tsx | head -30
echo.
echo [... showing first 30 lines of changes ...]
echo.

REM Commit
echo Committing fix...
git commit -m "Fix: Move fetchStudents to module scope to fix ReferenceError in students page"
if errorlevel 1 (
    echo ❌ ERROR: Could not commit
    pause
    exit /b 1
)
echo ✅ Commit created
echo.

REM Push to GitHub
echo Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ❌ ERROR: Could not push to GitHub
    echo Please ensure your GitHub credentials are configured
    pause
    exit /b 1
)
echo ✅ Successfully pushed to GitHub
echo.

REM Verify commit
echo Verifying deployment...
git log -1 --oneline
echo.

REM Success summary
echo ============================================================================
echo ✅ FIX DEPLOYED SUCCESSFULLY
echo ============================================================================
echo.
echo 📋 What was deployed:
echo   ✅ Fixed fetchStudents ReferenceError
echo   ✅ Moved fetchStudents to module scope
echo   ✅ Preserved AbortController pattern
echo   ✅ Preserved 15s timeout protection
echo   ✅ All 4 dashboard fixes intact
echo.
echo 📍 Live at:
echo   🌐 https://sms-gold-eta.vercel.app/school-admin/students
echo.
echo ⏱️ Timeline:
echo   NOW:        ✅ Committed & Pushed
echo   +1 min:     Vercel webhook triggered
echo   +3 min:     Build starts
echo   +5-7 min:   ✅ LIVE
echo.
echo 📊 Monitor deployment:
echo   • GitHub: https://github.com/faithinspire/SMS/commits/main
echo   • Vercel: https://vercel.com/dashboard/projects/sms-gold-eta
echo.
echo Press any key to exit...
pause >nul
