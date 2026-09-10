# Complete rebuild script for Next.js SMS project

Write-Host "🔄 SMS Complete Rebuild Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any running dev servers
Write-Host "1️⃣  Stopping any running dev servers..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Dev servers stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Clean cache
Write-Host "2️⃣  Cleaning Next.js cache..."
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "✅ .next directory removed" -ForegroundColor Green
}
if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force
    Write-Host "✅ node_modules cache removed" -ForegroundColor Green
}
Write-Host ""

# Step 3: Reinstall dependencies
Write-Host "3️⃣  Reinstalling dependencies..."
Write-Host "   Running: npm install" -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Test build
Write-Host "4️⃣  Testing build..."
Write-Host "   Running: npm run build" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed - checking for errors" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running manually:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor Cyan
    exit 1
}
Write-Host ""

# Step 5: Ready to run
Write-Host "5️⃣  Starting development server..."
Write-Host "   Running: npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎉 Application starting at http://localhost:3000" -ForegroundColor Green
Write-Host ""

npm run dev
