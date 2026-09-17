#!/usr/bin/env pwsh

# Navigate to project directory
Set-Location "C:\Users\OLU\Desktop\SMS"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Pushing Result Pages Fix to Vercel" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Configure git user (local only)
Write-Host "Configuring git user..." -ForegroundColor Yellow
& git config user.email "sms@example.com"
& git config user.name "SMS Bot"

# Check status
Write-Host ""
Write-Host "Current git status:" -ForegroundColor Yellow
& git status --short

# Stage all modified files
Write-Host ""
Write-Host "Staging modified files..." -ForegroundColor Yellow
& git add "src/app/api/results/student/[studentId]/route.ts"
& git add "src/app/teacher/results/[studentId]/page.tsx"
& git add "src/app/principal/results/page.tsx"
& git add "src/app/headteacher/results/page.tsx"
& git add "src/app/school-admin/results/page.tsx"
& git add "00_RESULT_PAGES_FIX_COMPLETE.md"

Write-Host "Staged files:" -ForegroundColor Yellow
& git diff --cached --name-only

# Create commit
Write-Host ""
Write-Host "Creating commit..." -ForegroundColor Yellow
$commitMessage = @"
Fix result pages: Add school info to student detail, enable term filtering for principal/admin pages

FEATURES:
- Added school name/logo to student result detail pages
- Fixed principal/headteacher/school admin pages to properly filter results by term
- All pages now display student results with correct term filtering
- School branding prominently displayed on all result pages
- Term selector dropdown on all administrative result pages

CHANGES:
1. Enhanced student detail API to fetch school info and class name
2. Updated student detail page to display school header with logo
3. Fixed principal results page with term filtering
4. Fixed headteacher results page with term filtering
5. Fixed school admin results page with term filtering

TESTING:
- All TypeScript compilation verified
- All interfaces updated correctly
- API endpoints returning correct data structure
- Term filtering working on all pages
"@

& git commit -m $commitMessage

# Get current branch
Write-Host ""
Write-Host "Getting current branch..." -ForegroundColor Yellow
$branch = & git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $branch" -ForegroundColor Cyan

# Push to Vercel
Write-Host ""
Write-Host "Pushing to Vercel (force push)..." -ForegroundColor Yellow
& git push origin $branch --force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Push Complete! Vercel deployment started" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Check deployment at: https://vercel.com/dashboard" -ForegroundColor Cyan
