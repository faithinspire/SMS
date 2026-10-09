@echo off
REM ============================================================
REM 🚀 VERCEL DEPLOYMENT SCRIPT FOR WINDOWS
REM ============================================================
REM This script deploys the SMS application to Vercel

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================================
echo 🚀 VERCEL DEPLOYMENT - School Management System
echo ============================================================
echo.

REM Check git status
echo [1/4] Checking git status...
git status >nul 2>&1
if errorlevel 1 (
    echo ❌ Git not configured or not in repo
    echo Please ensure you're in the SMS directory and git is initialized
    pause
    exit /b 1
)
echo ✅ Git repository ready

REM Verify changes
echo.
echo [2/4] Changes to deploy:
git status --short

REM Ask for confirmation
echo.
echo [3/4] Ready to deploy to production?
echo Press Y to continue, any other key to cancel
choice /c YN /N /T 5 /D N
if errorlevel 2 goto :cancel

REM Add and commit
echo.
echo [4/4] Committing and pushing...
git add -A
git commit -m "feat: deploy school admin staff/student registration system with multi-step modals"
if errorlevel 1 (
    echo ⚠️ Nothing to commit
    git push origin main
) else (
    git push origin main
)

echo.
echo ============================================================
echo ✅ DEPLOYMENT INITIATED
echo ============================================================
echo.
echo 📍 Vercel will automatically build and deploy
echo 🌐 Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta
echo 📊 Deployment should complete in 5-10 minutes
echo 🔴 Live at: https://sms-gold-eta.vercel.app
echo.
echo ✨ Features deployed:
echo   • Multi-step staff registration modal
echo   • Staff profile view modal
echo   • Student registration dropdown APIs
echo   • Real database data integration
echo.
pause
exit /b 0

:cancel
echo.
echo ❌ Deployment cancelled
pause
exit /b 1
