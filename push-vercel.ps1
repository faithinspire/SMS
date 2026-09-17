#!/usr/bin/env pwsh

# Force execution policy for this script
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Change to project directory
cd "c:\Users\OLU\Desktop\SMS"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PUSHING TO VERCEL - Migration 120" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configure git
Write-Host "[1/4] Configuring git..." -ForegroundColor Yellow
git config user.email "admin@sms.local"
git config user.name "SMS Deployment"

# Stage files
Write-Host "[2/4] Staging files..." -ForegroundColor Yellow
git add database/migrations/120_create_sessions_terms_and_populate.sql
git add src/app/admin/database-setup/page.tsx
git add src/app/api/admin/run-migration-120/route.ts

# Show what will be committed
Write-Host "[3/4] Files to commit:" -ForegroundColor Yellow
git diff --cached --name-only

# Commit
Write-Host "[4/4] Committing..." -ForegroundColor Yellow
git commit -m "Add Sessions, Terms, and Data Population - Migration 120

- Creates academic sessions for all schools (2025/2026)
- Creates 3 terms per school (First, Second, Third Term)
- Populates score sheets with realistic test data
- Admin page at /admin/database-setup to execute migration
- Enables result pages to display student scores by term"

# Push to Vercel
Write-Host ""
Write-Host "PUSHING TO VERCEL..." -ForegroundColor Cyan
git push origin main --force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT INITIATED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Vercel deployment is starting..." -ForegroundColor Cyan
Write-Host "Check: https://vercel.com/dashboard" -ForegroundColor Yellow
Write-Host "Wait 2-5 minutes for build to complete" -ForegroundColor Yellow
Write-Host ""
Write-Host "After deployment, run migration at:" -ForegroundColor Cyan
Write-Host "https://sms-gold-eta.vercel.app/admin/database-setup" -ForegroundColor Yellow
