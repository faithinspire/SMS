#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy SMS Dashboard Fixes to GitHub and Vercel
.DESCRIPTION
    Stages, commits, and pushes the dashboard fix code to GitHub.
    Vercel will automatically detect the push and deploy.
.AUTHOR
    SMS System
.EXAMPLE
    .\DEPLOY_DASHBOARD_FIXES.ps1
#>

# Colors for output
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Blue = "`e[34m"
$Reset = "`e[0m"

Write-Host "${Blue}═════════════════════════════════════════════════════════${Reset}"
Write-Host "${Blue}SMS Dashboard Fixes - Deployment Script${Reset}"
Write-Host "${Blue}═════════════════════════════════════════════════════════${Reset}"
Write-Host ""

# Navigate to repo
$repoPath = "c:\Users\OLU\Desktop\SMS"
if (-not (Test-Path $repoPath)) {
    Write-Host "${Red}❌ ERROR: Repository path not found: $repoPath${Reset}"
    exit 1
}

Write-Host "${Yellow}[1/5]${Reset} Navigating to repository..."
Set-Location $repoPath
Write-Host "${Green}✅ Repository found${Reset}"
Write-Host ""

# Check git status
Write-Host "${Yellow}[2/5]${Reset} Checking git status..."
$status = git status --short
if (-not $status) {
    Write-Host "${Yellow}⚠️  No changes detected. Files may already be staged.${Reset}"
} else {
    Write-Host "${Green}✅ Changed files detected:${Reset}"
    Write-Host $status
}
Write-Host ""

# Stage changes
Write-Host "${Yellow}[3/5]${Reset} Staging all changes..."
try {
    git add .
    Write-Host "${Green}✅ Changes staged${Reset}"
} catch {
    Write-Host "${Red}❌ ERROR: Failed to stage changes${Reset}"
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Commit
Write-Host "${Yellow}[4/5]${Reset} Creating commit..."
$commitMessage = "Professional fix: Resolve staff/students infinite loading, missing database columns, empty dropdowns with graceful error handling (AbortController pattern, Schema migration 147, Timeout protection)"
try {
    git commit -m $commitMessage
    Write-Host "${Green}✅ Commit created${Reset}"
} catch {
    Write-Host "${Yellow}⚠️  No changes to commit (may already be committed)${Reset}"
}
Write-Host ""

# Push to GitHub
Write-Host "${Yellow}[5/5]${Reset} Pushing to GitHub..."
try {
    git push origin main
    Write-Host "${Green}✅ Successfully pushed to GitHub${Reset}"
} catch {
    Write-Host "${Red}❌ ERROR: Failed to push${Reset}"
    Write-Host "${Red}This could be because:${Reset}"
    Write-Host "  1. GitHub credentials not cached"
    Write-Host "  2. Network connection issue"
    Write-Host "  3. Permission denied"
    Write-Host ""
    Write-Host "${Red}Error details:${Reset}"
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "${Yellow}Try:${Reset}"
    Write-Host "  • git config user.name 'Your Name'"
    Write-Host "  • git config user.email 'your@email.com'"
    Write-Host "  • gh auth login (if using GitHub CLI)"
    exit 1
}
Write-Host ""

# Success
Write-Host "${Blue}═════════════════════════════════════════════════════════${Reset}"
Write-Host "${Green}✅ DEPLOYMENT INITIATED${Reset}"
Write-Host "${Blue}═════════════════════════════════════════════════════════${Reset}"
Write-Host ""
Write-Host "${Green}Status:${Reset}"
Write-Host "  ✅ Code pushed to GitHub (main branch)"
Write-Host "  ✅ Vercel webhook triggered (automatic)"
Write-Host "  ✅ Build starting on Vercel"
Write-Host ""
Write-Host "${Yellow}Next Steps:${Reset}"
Write-Host "  1. Monitor Vercel: https://vercel.com/dashboard/projects/sms-gold-eta"
Write-Host "  2. Run SQL migration in Supabase (see DASHBOARD_FIXES_DEPLOYMENT.md)"
Write-Host "  3. Test pages after deployment completes (~5-10 minutes)"
Write-Host ""
Write-Host "${Blue}Timeline:${Reset}"
Write-Host "  NOW:      Code pushed to GitHub"
Write-Host "  +30 sec:  Vercel detects push"
Write-Host "  +1 min:   Vercel starts building"
Write-Host "  +5 min:   Build completes"
Write-Host "  +5-10min: 🎉 LIVE on Vercel"
Write-Host ""
Write-Host "${Yellow}Important:${Reset}"
Write-Host "  ⚠️  Don't forget to run the SQL migration in Supabase!"
Write-Host "  🗄️  Check DASHBOARD_FIXES_DEPLOYMENT.md for SQL commands"
Write-Host ""
