Set-Location "c:\Users\OLU\Desktop\SMS"

Write-Host "Setting git config..." -ForegroundColor Cyan
git config user.email "dev@school.local"
git config user.name "SMS Developer"

Write-Host "Staging files..." -ForegroundColor Cyan
git add "src/app/api/results/ensure-school-data/route.ts"
git add "src/app/api/results/school-sessions-and-terms/route.ts"
git add "database/migrations/123_auto_populate_test_students.sql"

Write-Host "Current git status:" -ForegroundColor Cyan
git status

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m "Feat: Auto-populate test students for classes and fix results page display

- Add Migration 123: Auto-generate 10 test students per class_arm_combo
- Update ensure-school-data endpoint to create test students when classes are created  
- Fix term_order column reference in school-sessions-and-terms API query
- Ensure students appear in Principal, Headteacher, and School Admin results pages
- Students are properly linked to class_arm_combo_id for correct display"

Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push origin main

Write-Host "Latest commit:" -ForegroundColor Cyan
git log --oneline -1

Write-Host "✅ Commit and push completed successfully!" -ForegroundColor Green
