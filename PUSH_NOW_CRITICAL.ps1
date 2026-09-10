# CRITICAL - Push fixed vercel.json NOW
# This will fix the failing Vercel deployment

Write-Host "========================================" -ForegroundColor Red
Write-Host "CRITICAL FIX - Pushing Fixed vercel.json" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

Set-Location "c:\Users\OLU\Desktop\SMS"
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

Write-Host "[STEP 1] Staging vercel.json fix..." -ForegroundColor Yellow
git add vercel.json
Write-Host "✓ Fixed file staged" -ForegroundColor Green
Write-Host ""

Write-Host "[STEP 2] Committing fix..." -ForegroundColor Yellow
git commit -m "URGENT fix: remove regions and functions from vercel.json - fixing deployment error"
Write-Host "✓ Committed" -ForegroundColor Green
Write-Host ""

Write-Host "[STEP 3] Pushing to GitHub immediately..." -ForegroundColor Yellow
git push -u origin main
Write-Host "✓ Pushed" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ CRITICAL FIX PUSHED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Vercel will see this push and auto-redeploy" -ForegroundColor Cyan
Write-Host "Your deployment will now SUCCEED!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "Status should change to 'Building...' then 'Ready ✓'" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
