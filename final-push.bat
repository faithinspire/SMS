@echo off
setlocal enabledelayedexpansion

cd /d c:\Users\OLU\Desktop\SMS

echo Pushing Migration 121 to Vercel...
git push origin main --verbose

echo.
echo Done.
