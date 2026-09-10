# Hard clean rebuild script
Write-Host "Stopping all Node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Removing .next cache..."
if (Test-Path ".\.next") {
    Remove-Item -Path ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ".next directory removed"
}

Write-Host "Starting fresh dev server..."
npm run dev
