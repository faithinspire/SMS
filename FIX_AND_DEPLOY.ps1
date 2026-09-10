# Hard Terminal Fix and Vercel Deployment Script
# Run in PowerShell

Write-Host "========================================" -ForegroundColor Green
Write-Host "FTECH SMS - Terminal Hard Fix & Deploy" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Navigate to project
Set-Location "c:\Users\OLU\Desktop\SMS"
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check git status
Write-Host "[STEP 1] Checking git status..." -ForegroundColor Yellow
git status
Write-Host ""

# Step 2: Add changes
Write-Host "[STEP 2] Adding all changes to git..." -ForegroundColor Yellow
git add .
Write-Host "✓ Changes staged" -ForegroundColor Green
Write-Host ""

# Step 3: Commit
Write-Host "[STEP 3] Committing changes..." -ForegroundColor Yellow
git commit -m "fix: remove invalid functions pattern from vercel.json - ready for deployment"
Write-Host "✓ Committed" -ForegroundColor Green
Write-Host ""

# Step 4: Push
Write-Host "[STEP 4] Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main
Write-Host "✓ Pushed to GitHub" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ DEPLOYMENT READY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://vercel.com" -ForegroundColor White
Write-Host "2. Check your deployment status" -ForegroundColor White
Write-Host "3. Your app should be live in 2-3 minutes!" -ForegroundColor White
Write-Host ""
Write-Host "Your live URL will be something like:" -ForegroundColor Cyan
Write-Host "https://school-management-saas.vercel.app" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
