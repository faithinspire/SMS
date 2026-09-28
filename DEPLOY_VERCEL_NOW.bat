@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo 🚀 VERCEL DEPLOYMENT
echo ============================================================================
echo.

cd /d c:\Users\OLU\Desktop\SMS

echo Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo Deploying...
node SIMPLE_DEPLOY.js

pause
