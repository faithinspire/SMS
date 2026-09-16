# PowerShell Deployment Script for Vercel
# This script commits and pushes the scores fix to Vercel

Set-Location "c:\Users\OLU\Desktop\SMS"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SMS Results Page Scores Fix - Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "Checking git status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Pushing to Vercel..." -ForegroundColor Yellow
Write-Host ""

# Push to main branch with --force to ensure deployment
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ Push successful!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vercel will auto-deploy. Check progress at:" -ForegroundColor Cyan
    Write-Host "https://vercel.com/dashboard" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your fix is now being deployed to production!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "❌ Push failed!" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Write-Host "Deployed file:" -ForegroundColor Yellow
Write-Host "src/app/api/results/student/[studentId]/route.ts" -ForegroundColor Cyan
Write-Host ""
Write-Host "Commit: 02b110f" -ForegroundColor Cyan
Write-Host "Message: Fix: Query score_sheets directly instead of filtering through student_subjects" -ForegroundColor Cyan
