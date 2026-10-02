# Complete deployment script for SMS system
# This script will:
# 1. Create Supabase migration
# 2. Commit code changes
# 3. Push to GitHub
# 4. Trigger Vercel deployment

Write-Host "================================" -ForegroundColor Cyan
Write-Host "SMS COMPLETE DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "📋 Checking git status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "🔍 Checking for modified files..." -ForegroundColor Yellow
$modified = git diff --name-only
if ($modified) {
    Write-Host "✅ Modified files found:" -ForegroundColor Green
    Write-Host $modified
} else {
    Write-Host "ℹ️  No uncommitted changes detected" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Files to be committed:" -ForegroundColor Yellow
Write-Host "  - src/services/staff-registration.service.ts (table name fix)"
Write-Host "  - src/app/school-admin/students/[id]/page.tsx (PGRST116 fix)"
Write-Host "  - src/app/school-admin/transactions/page.tsx (PGRST116 fix)"
Write-Host "  - src/app/school-admin/staff/page.tsx (staff edit modal)"
Write-Host ""

# Commit changes
Write-Host "💾 Staging files for commit..." -ForegroundColor Yellow
git add src/services/staff-registration.service.ts `
        src/app/school-admin/students/[id]/page.tsx `
        src/app/school-admin/transactions/page.tsx `
        src/app/school-admin/staff/page.tsx `
        --verbose

Write-Host ""
Write-Host "📤 Creating commit..." -ForegroundColor Yellow
git commit -m "🔧 HARD FIX: Teacher subject assignment + PGRST116 error handling + Staff modal enhancement

FIXES:
- Fix staff registration table name (subject_teacher_assignments)
- Replace .single() with .maybeSingle() for graceful error handling
- Enhance staff edit modal with salary/bank/account fields
- Maintain multi-tenant data isolation via school_id indexes

DEPLOYMENT READY: Execute Supabase migrations in SQL Editor"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit created successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Commit may have been skipped (no changes)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code pushed to GitHub successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Push failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  EXECUTE SUPABASE MIGRATIONS:"
Write-Host "   - Go to https://supabase.com"
Write-Host "   - Open SMS project"
Write-Host "   - Navigate to SQL Editor"
Write-Host "   - Create New Query"
Write-Host "   - Copy-paste contents of: RUN_THIS_IN_SUPABASE_NOW.sql"
Write-Host "   - Click RUN"
Write-Host ""
Write-Host "2️⃣  VERIFY DEPLOYMENT:"
Write-Host "   - Check Vercel dashboard at https://vercel.com"
Write-Host "   - Wait for deployment to complete (usually 2-5 minutes)"
Write-Host "   - Visit your app URL to verify changes"
Write-Host ""
Write-Host "3️⃣  TEST IN PRODUCTION:"
Write-Host "   - Register new teacher with subjects"
Write-Host "   - Verify subjects appear in dashboard"
Write-Host "   - Register new student"
Write-Host "   - Verify class & subjects assigned"
Write-Host "   - Open Results page"
Write-Host "   - Verify sessions load"
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ CODE DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
