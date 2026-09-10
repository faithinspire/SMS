# Quick Population Script for All Schools

$SupabaseUrl = "https://egdreueuspmuxhezdpqm.supabase.co"
$ServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MDQzOSwiImV4cCI6MjA5NzUzNjQzOX0.Ae9n1r6m_hkvQNqACjIoe--bNcTfJ9AMzSW2VcRxMZk"
$ApiUrl = "http://localhost:3000"

Write-Host "🔍 Fetching all schools from Supabase..." -ForegroundColor Cyan

# Get all schools
$headers = @{
    "Authorization" = "Bearer $ServiceKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod `
        -Uri "$SupabaseUrl/rest/v1/schools?select=id,name" `
        -Headers $headers `
        -Method Get
    
    Write-Host "✅ Found $($response.Count) schools" -ForegroundColor Green
    
    foreach ($school in $response) {
        Write-Host "`n📚 Processing: $($school.name) ($($school.id))" -ForegroundColor Yellow
        
        try {
            $populateResponse = Invoke-RestMethod `
                -Uri "$ApiUrl/api/setup/init-school-data" `
                -Method Post `
                -Headers @{ "Content-Type" = "application/json" } `
                -Body (ConvertTo-Json @{ "schoolId" = $school.id })
            
            if ($populateResponse.status -eq "success") {
                Write-Host "✅ Success: $($populateResponse.data.stats.classCount) classes, $($populateResponse.data.stats.subjectCount) subjects" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Already populated or error: $($populateResponse.message)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`n🎉 All schools populated!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error fetching schools: $_" -ForegroundColor Red
}
