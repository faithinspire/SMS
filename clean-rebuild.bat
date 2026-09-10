@echo off
REM Kill node processes
taskkill /f /im node.exe 2>nul
timeout /t 2
REM Remove .next cache
if exist .next rmdir /s /q .next
REM Start fresh dev server
npm run dev
