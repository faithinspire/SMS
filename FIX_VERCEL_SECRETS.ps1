# Fix Vercel Environment Variables - Set Missing Secrets

# Read Supabase credentials from .env.local
$envFile = Get-Content '.env.local' -Raw
$supabaseUrl = 'https://egdreueuspmuxhezdpqm.supabase.co'
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjA0MzksImV4cCI6MjA5NzUzNjQzOX0.egM1RzKJ6ThUy6xrz_Os3OYsy_p5Oyyr0RxL9N1tbGI'

# Vercel Project Details
$projectId = 'prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY'
$teamId = 'team_TL6yFOaJymXvXyXzVF1UmAzo'

Write-Host "=== Vercel Secrets Configuration ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project ID: $projectId" -ForegroundColor Gray
Write-Host "Team ID: $teamId" -ForegroundColor Gray
Write-Host ""

# Read Vercel token from environment (needs to be set beforehand)
$vercelToken = $env:VERCEL_TOKEN
if (-not $vercelToken) {
    Write-Host "❌ VERCEL_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix this manually in Vercel Dashboard:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://vercel.com/dashboard/projects/sms/settings/environment-variables"
    Write-Host "2. Add new Environment Variable:"
    Write-Host "   Name: supabase_url"
    Write-Host "   Value: $supabaseUrl"
    Write-Host "   Environments: Production, Preview, Development"
    Write-Host ""
    Write-Host "3. Add another Environment Variable:"
    Write-Host "   Name: supabase_key"
    Write-Host "   Value: $supabaseKey"
    Write-Host "   Environments: Production, Preview, Development"
    Write-Host ""
    Write-Host "4. Redeploy from Vercel dashboard"
    exit 1
}

Write-Host "✅ Vercel Token found" -ForegroundColor Green
Write-Host ""

# Function to set environment variable via Vercel API
function Set-VercelEnv {
    param(
        [string]$name,
        [string]$value,
        [string]$token,
        [string]$projectId,
        [string]$teamId
    )
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        key = $name
        value = $value
        target = @("production", "preview", "development")
    } | ConvertTo-Json
    
    $uri = "https://api.vercel.com/v10/projects/$projectId/env?teamId=$teamId"
    
    try {
        $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body
        return $true
    } catch {
        return $false
    }
}

Write-Host "Setting environment variables..." -ForegroundColor Cyan
Write-Host ""

# Set supabase_url
Write-Host "Adding: supabase_url" -ForegroundColor Yellow
if (Set-VercelEnv -name "supabase_url" -value $supabaseUrl -token $vercelToken -projectId $projectId -teamId $teamId) {
    Write-Host "✅ supabase_url configured" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to set supabase_url" -ForegroundColor Red
}

# Set supabase_key
Write-Host "Adding: supabase_key" -ForegroundColor Yellow
if (Set-VercelEnv -name "supabase_key" -value $supabaseKey -token $vercelToken -projectId $projectId -teamId $teamId) {
    Write-Host "✅ supabase_key configured" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to set supabase_key" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Manual Configuration (RECOMMENDED for immediate fix):"
Write-Host "   Visit: https://vercel.com/dashboard/projects/sms/settings/environment-variables"
Write-Host "   Add the two secrets shown above"
Write-Host ""
Write-Host "2. Trigger Redeploy:"
Write-Host "   After adding secrets, go to Deployments tab"
Write-Host "   Click '...' on latest deployment and select 'Redeploy'"
Write-Host ""
Write-Host "3. Verify:"
Write-Host "   Check: https://sms-gold-eta.vercel.app/school-admin/dashboard"
Write-Host ""
