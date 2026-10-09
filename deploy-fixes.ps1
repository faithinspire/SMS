# Deploy production fixes to Vercel
# This script commits and pushes the staff profile and class-combos fixes

Write-Host "=== DEPLOYING PRODUCTION FIXES TO VERCEL ===" -ForegroundColor Green
Write-Host ""

# Change to project directory
Set-Location "c:\Users\OLU\Desktop\SMS"

# Check git status
Write-Host "Checking git status..." -ForegroundColor Cyan
git status

Write-Host ""
Write-Host "Staging fixed API routes..." -ForegroundColor Cyan
git add "src/app/api/school-admin/staff/[id]/profile/route.ts"
git add "src/app/api/teaching/class-combos/route.ts"

Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m "Production hotfix: Fix staff profile 404 and class-combos 500 errors

ROOT CAUSES FIXED:
1. Staff profile 404: Added fallback to handle both staff.id and user.id lookups
2. Class-combos 500: Removed invalid orderBy syntax, added client-side sorting

CHANGES:
- src/app/api/school-admin/staff/[id]/profile/route.ts: Enhanced to lookup by user.id if staff.id not found
- src/app/api/teaching/class-combos/route.ts: Removed invalid .order() call, implemented client-side sort

STATUS: Ready for production deployment"

Write-Host ""
Write-Host "Pushing to GitHub (triggers Vercel deployment)..." -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "=== DEPLOYMENT INITIATED ===" -ForegroundColor Green
Write-Host ""
Write-Host "Vercel will automatically deploy when push completes."
Write-Host "Monitor deployment at: https://vercel.com/dashboard"
Write-Host ""
Write-Host "Expected deployment time: 3-5 minutes"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Check Vercel dashboard for deployment status"
Write-Host "2. Test staff profile API: GET /api/school-admin/staff/{id}/profile"
Write-Host "3. Test class-combos API: GET /api/teaching/class-combos"
Write-Host "4. Verify staff profile modal loads without 404"
Write-Host "5. Verify staff registration Step 5 loads classes without 500"
