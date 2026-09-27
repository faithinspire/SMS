@echo off
cd /d "c:\Users\OLU\Desktop\SMS"
echo Committing changes...
git add .
git commit -m "Complete school admin dashboard rebuild with functional letters, edit/delete buttons, professional Results/Fees/Academic tabs"
echo Pushing to main...
git push origin main
echo Deployment complete!
pause
