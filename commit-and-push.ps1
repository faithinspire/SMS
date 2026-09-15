#!/usr/bin/env pwsh
cd 'c:\Users\OLU\Desktop\SMS'

Write-Host "Step 1: Adding all files..."
git add -A
Write-Host "Done"

Write-Host "`nStep 2: Committing..."
git commit -m "CRITICAL FIX: Remove nested field queries blocking teacher registration and add auto-loading sessions/terms with CBT scores"
Write-Host "Done"

Write-Host "`nStep 3: Force pushing to main..."
git push -f origin main
Write-Host "Done"

Write-Host "`n✅ Force push complete! Vercel should deploy automatically."
Write-Host "Check https://vercel.com/dashboard/sms in 1-2 minutes"
