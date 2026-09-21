@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo Checking last 10 commits...
git log --oneline -10
echo.
echo Checking if migration 121 exists...
git log --oneline --all | findstr "121\|disable_rls\|RLS"
