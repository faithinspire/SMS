@echo off
cd /d "c:\Users\OLU\Desktop\SMS"
git config user.email "dev@school.local"
git config user.name "SMS Developer"
git add "src/app/api/results/ensure-school-data/route.ts" "src/app/api/results/school-sessions-and-terms/route.ts" "database/migrations/123_auto_populate_test_students.sql"
git status
git commit -m "Feat: Auto-populate test students for classes and fix results page display - Add Migration 123: Auto-generate 10 test students per class_arm_combo - Update ensure-school-data endpoint to create test students when classes are created - Fix term_order column reference in school-sessions-and-terms API query - Ensure students appear in Principal, Headteacher, and School Admin results pages - Students are properly linked to class_arm_combo_id for correct display"
git push origin main
git log --oneline -1
pause
