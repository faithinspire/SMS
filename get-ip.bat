@echo off
echo.
echo ========================================
echo FINDING YOUR SYSTEM IP ADDRESS...
echo ========================================
echo.

REM Get IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find /i "IPv4"') do (
    set "ip=%%a"
    goto :found
)

:found
if defined ip (
    REM Trim leading/trailing spaces
    setlocal enabledelayedexpansion
    set "ip=!ip: =!"
    echo.
    echo ✅ YOUR SYSTEM IP ADDRESS:
    echo.
    echo    %ip%
    echo.
    echo 📱 ACCESS ON YOUR PHONE:
    echo.
    echo    http://%ip%:3000
    echo.
    echo ========================================
    echo Server Port: 3000
    echo Make sure your phone is on same WiFi!
    echo ========================================
    echo.
) else (
    echo ❌ Could not find IP address
    echo Please check your network connection
)

pause
