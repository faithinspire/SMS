@echo off
cd /d "c:\Users\OLU\Desktop\SMS"
git add -A
git commit -m "Fix: Refactor results page - memoize loadClassesForTerm, fix useCallback dependencies, prevent infinite loop"
git push origin main
echo Done
pause
