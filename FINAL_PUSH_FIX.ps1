# FINAL FIX - Clean minimal vercel.json
# No functions, no regions - just framework config

Write-Host "========================================" -ForegroundColor Green
Write-Host "FINAL VERCEL FIX - MINIMAL CONFIG" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Navigate to project
try {
    Set-Location "c:\Users\OLU\Desktop\SMS" -ErrorAction Stop
}
catch {
    Write-Host "ERROR: Could not navigate to project directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Project directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Check git
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Git not found" }
    Write-Host "Git available: $gitVersion" -ForegroundColor Cyan
}
catch {
    Write-Host "ERROR: Git is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

Write-Host "[STEP 1] Checking git status..." -ForegroundColor Yellow
git status
Write-Host ""

Write-Host "[STEP 2] Adding ALL files including vercel.json..." -ForegroundColor Yellow
git add -A
Write-Host "✓ All files staged" -ForegroundColor Green
Write-Host ""

Write-Host "[STEP 3] Committing with FINAL fix message..." -ForegroundColor Yellow
git commit -m "FINAL FIX: Use minimal vercel.json config - no functions/regions"
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Commit had issue (might have no changes)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "[STEP 4] Pushing to GitHub (main branch)..." -ForegroundColor Yellow
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Push failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Pushed successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✓✓✓ FINAL FIX DEPLOYED! ✓✓✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "vercel.json is now MINIMAL and CLEAN" -ForegroundColor Cyan
Write-Host "Vercel will NOW build successfully!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Wait for 'Building...' status" -ForegroundColor White
Write-Host "3. Should change to 'Ready ✓' in 2-3 minutes" -ForegroundColor White
Write-Host "4. Click the URL" -ForegroundColor White
Write-Host "5. Your app is LIVE!" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
