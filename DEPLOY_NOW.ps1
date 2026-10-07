#!/usr/bin/env pwsh

$ErrorActionPreference = "Continue"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "FTECH SMS - VERCEL DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting deployment process..." -ForegroundColor Yellow
Write-Host ""

Set-Location "c:\Users\OLU\Desktop\SMS"

# Step 1: Clean
Write-Host "[1/5] Cleaning previous build..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
    Write-Host "✓ Old build cleaned" -ForegroundColor Green
} else {
    Write-Host "✓ No previous build found" -ForegroundColor Green
}
Write-Host ""

# Step 2: Install
Write-Host "[2/5] Installing dependencies (if needed)..." -ForegroundColor Cyan
npm install --legacy-peer-deps 2>$null | Out-Null
Write-Host "✓ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Step 3: Build
Write-Host "[3/5] Building production version..." -ForegroundColor Cyan
npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ BUILD FAILED!" -ForegroundColor Red
    Write-Host "Please check the errors above." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Build successful!" -ForegroundColor Green
Write-Host ""

# Step 4: Git Add
Write-Host "[4/5] Staging changes for git..." -ForegroundColor Cyan
git add . 2>&1 | Out-Null
Write-Host "✓ Changes staged" -ForegroundColor Green
Write-Host ""

# Step 5: Commit & Push
Write-Host "[5/5] Committing and pushing to Vercel..." -ForegroundColor Cyan
git commit -m "Deploy: Fix Suspense boundaries for dynamic rendering - ready for production" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Git commit may have failed (might already be committed)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Pushing to main branch (Vercel will auto-deploy)..." -ForegroundColor Cyan
git push origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Push failed!" -ForegroundColor Red
    Write-Host "Please check git credentials." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "✓ DEPLOYMENT INITIATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://vercel.com" -ForegroundColor White
Write-Host "2. Find your SMS project" -ForegroundColor White
Write-Host "3. Watch for the green 'Ready' status" -ForegroundColor White
Write-Host "4. Deployment typically takes 2-5 minutes" -ForegroundColor White
Write-Host ""
Write-Host "The build should complete without errors!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Read-Host "Press Enter to exit"
