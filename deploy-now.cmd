@echo off
cd /d "%~dp0"
echo Deploying to Vercel...
node vercel-direct-deploy.js
pause
