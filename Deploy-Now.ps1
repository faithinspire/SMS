Write-Host "🚀 Deploying SMS Dashboard to Vercel" -ForegroundColor Cyan
Write-Host ""

$repoPath = "c:\Users\OLU\Desktop\SMS"
Set-Location $repoPath

Write-Host "[1/3] Staging changes..." -ForegroundColor Yellow
git add -A 2>&1 | Out-Null

Write-Host "[2/3] Committing..." -ForegroundColor Yellow
git commit -m "Deploy: Dashboard and navbar fixes - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 2>&1 | Out-Null

Write-Host "[3/3] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main 2>&1

Write-Host ""
Write-Host "✅ Deployment sent!" -ForegroundColor Green
Write-Host ""
Write-Host "Vercel will automatically build and deploy in 1-2 minutes"
Write-Host "Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta"
Write-Host ""
