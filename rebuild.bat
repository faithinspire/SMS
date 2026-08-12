@echo off
echo ========================================
echo SMS - Clean Rebuild Script
echo ========================================
echo.

echo [1/5] Stopping any running processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/5] Cleaning build folders...
rmdir /s /q .next >nul 2>&1
rmdir /s /q node_modules >nul 2>&1

echo [3/5] Installing dependencies...
call npm install

echo [4/5] Building project...
call npm run build

echo [5/5] Done!
echo.
echo To start the development server, run:
echo   npm run dev
echo.
echo To start production server, run:
echo   npm start
echo.
pause
