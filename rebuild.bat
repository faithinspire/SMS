@echo off
cd /d c:\Users\OLU\Desktop\SMS

echo Cleaning build cache...
if exist .next (
    rmdir /s /q .next
    echo .next folder deleted
) else (
    echo .next folder does not exist
)

echo.
echo Installing dependencies...
call npm install

echo.
echo Building project...
call npm run build

echo.
echo Build complete!
echo.
echo Starting development server...
call npm run dev
