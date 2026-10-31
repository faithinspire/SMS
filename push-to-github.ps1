# PowerShell script to push to GitHub and trigger Vercel
cd c:\Users\OLU\Desktop\SMS

# Get git configuration
$gitOutput = & git config --get remote.origin.url 2>&1

Write-Host "Git Remote URL:" -ForegroundColor Cyan
Write-Host $gitOutput -ForegroundColor Yellow

# Try to add and commit
Write-Host "`nAttempting to add changes..." -ForegroundColor Cyan
& git add -A

Write-Host "Attempting to commit..." -ForegroundColor Cyan
& git commit -m "fix: Enhanced staff registration logging for debugging submit button issue"

Write-Host "Attempting to push to main branch..." -ForegroundColor Cyan
& git push origin main

Write-Host "`n✅ Push complete! Vercel will auto-deploy within 1-2 minutes." -ForegroundColor Green
Write-Host "Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta" -ForegroundColor Yellow
