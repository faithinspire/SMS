# Add export const dynamic = 'force-dynamic' to all API route files
Get-ChildItem -Path "src/app/api" -Recurse -Include "route.ts", "route.tsx" | ForEach-Object {
    $file = $_
    $content = Get-Content -Path $file.FullName -Raw
    
    # Skip if already has dynamic export
    if ($content -match "export const dynamic = 'force-dynamic'") {
        Write-Host "Skipping $($file.Name) - already has dynamic export"
        return
    }
    
    # Find the last import statement
    $lines = $content -split "`n"
    $lastImportIndex = -1
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^import ") {
            $lastImportIndex = $i
        }
    }
    
    # Add export after imports
    if ($lastImportIndex -ge 0) {
        $lines[$lastImportIndex] = $lines[$lastImportIndex] + "`nexport const dynamic = 'force-dynamic'`n"
        $newContent = $lines -join "`n"
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        Write-Host "Added dynamic export to $($file.FullName)"
    }
}

Write-Host "Done!"
