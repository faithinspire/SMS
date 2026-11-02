@echo off
cd /d c:\Users\OLU\Desktop\SMS
echo Pushing hard fix to GitHub...
git add -A
git commit -m "hard fix: Staff registration submit - complete rewrite with explicit logging"
git push origin main
echo Push complete!
pause
