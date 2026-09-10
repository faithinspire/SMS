# PowerShell script to add "export const dynamic = 'force-dynamic'" as FIRST line in all API routes
# This MUST be the first line, before any imports, for Next.js to recognize it

$apiDir = "src/app/api"
$counter = 0
$dynamicExportLine = "export const dynamic = 'force-dynamic';"

# Get all route files (route.ts, route.js, route.tsx)
$routeFiles = Get-ChildItem -Path $apiDir -Recurse -Include "route.ts", "route.js", "route.tsx"

Write-Host "Found $($routeFiles.Count) route files"

foreach ($file in $routeFiles) {
    $filePath = $file.FullName
    $relativePath = Resolve-Path -Path $filePath -Relative
    
    # Read the file content
    $content = Get-Content -Path $filePath -Raw
    
    # Check if dynamic export already exists
    if ($content -match "export const dynamic") {
        Write-Host "⊘ SKIP: $relativePath (already has dynamic export)"
        continue
    }
    
    # Check if file is empty
    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Host "⊘ SKIP: $relativePath (empty file)"
        continue
    }
    
    # Insert the dynamic export as the FIRST line
    $newContent = $dynamicExportLine + "`r`n" + $content
    
    # Write back to file
    Set-Content -Path $filePath -Value $newContent -Encoding UTF8
    
    $counter++
    Write-Host "✓ FIXED: $relativePath"
}

Write-Host "`n✓ Total files updated: $counter"
