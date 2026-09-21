$ErrorActionPreference = "Stop"

cd "c:\Users\OLU\Desktop\SMS"

Write-Host "🚀 Pushing Migration 121 to Vercel..." -ForegroundColor Green
Write-Host ""

# Show current status
Write-Host "Local HEAD:" (git rev-parse HEAD)
Write-Host "Remote HEAD:" (git rev-parse origin/main)
Write-Host ""

# Push with force if needed
try {
    Write-Host "Executing: git push origin main" -ForegroundColor Cyan
    & git push origin main 2>&1
    Write-Host ""
    Write-Host "✅ Push completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verifying push..."
Start-Sleep -Seconds 2

try {
    $newRemote = & git rev-parse origin/main 2>&1
    $local = & git rev-parse HEAD 2>&1
    
    if ($newRemote -eq $local) {
        Write-Host "✅ SUCCESS: Migration 121 pushed to Vercel" -ForegroundColor Green
        Write-Host ""
        Write-Host "⏳ Vercel will now:"
        Write-Host "  1. Detect the new commit"
        Write-Host "  2. Re-deploy the application"
        Write-Host "  3. Run Migration 121 automatically"
        Write-Host "  4. Disable RLS on result tables"
        Write-Host "  5. Classes and students will load"
    } else {
        Write-Host "⚠️ Local and remote differ" -ForegroundColor Yellow
        Write-Host "Local:  $local"
        Write-Host "Remote: $newRemote"
    }
} catch {
    Write-Host "Could not verify: $_" -ForegroundColor Yellow
}
