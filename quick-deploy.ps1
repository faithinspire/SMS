# Quick Deploy Script
cd "c:\Users\OLU\Desktop\SMS"

Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Cyan
Write-Host ""

# Configure git
git config user.name "Kiro Deploy Bot"
git config user.email "deploy@sms.local"

# Stage the fix
Write-Host "[1/4] Staging syntax fix..." -ForegroundColor Yellow
git add "src/app/school-admin/students/page.tsx"

# Commit
Write-Host "[2/4] Committing changes..." -ForegroundColor Yellow
git commit -m "Fix: Remove orphaned JSX code and duplicate button in students page"

# Push to GitHub (which triggers Vercel webhook)
Write-Host "[3/4] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "[4/4] Deployment triggered!" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Changes pushed to GitHub" -ForegroundColor Green
Write-Host "✅ Vercel webhook will be triggered automatically" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Monitor at:"
Write-Host "   https://vercel.com/dashboard/projects/sms-gold-eta" -ForegroundColor Cyan
Write-Host "   https://sms-gold-eta.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected to be live in 5-10 minutes" -ForegroundColor Magenta
