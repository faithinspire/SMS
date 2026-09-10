@echo off
REM This script enables phone connection by allowing port 3000 through Windows Firewall

echo.
echo ========================================
echo ENABLING PHONE CONNECTION...
echo ========================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script requires admin rights!
    echo.
    echo Please:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    pause
    exit /b 1
)

echo Step 1: Allowing Node.js through firewall...
netsh advfirewall firewall add rule name="Allow Node.js SMS" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ Node.js rule added
) else (
    echo   - Node.js rule may already exist
)

echo.
echo Step 2: Allowing port 3000...
netsh advfirewall firewall add rule name="Allow Port 3000 SMS" dir=in action=allow protocol=tcp localport=3000 enable=yes >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✓ Port 3000 rule added
) else (
    echo   - Port 3000 rule may already exist
)

echo.
echo Step 3: Getting your computer IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find /i "IPv4"') do (
    set "ip=%%a"
    goto :found
)

:found
if defined ip (
    setlocal enabledelayedexpansion
    set "ip=!ip: =!"
    echo   ✓ Your IP: !ip!
    echo.
    echo ========================================
    echo PHONE CONNECTION ENABLED!
    echo ========================================
    echo.
    echo On your phone, go to:
    echo   http://!ip!:3000
    echo.
    echo Make sure your phone is on the SAME WiFi!
    echo ========================================
    echo.
) else (
    echo ERROR: Could not detect IP address
)

pause
