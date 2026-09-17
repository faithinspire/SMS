@echo off
cd /d c:\Users\OLU\Desktop\SMS
git add src/app/api/results/student/[studentId]/route.ts
git add src/app/teacher/results/[studentId]/page.tsx
git add src/app/principal/results/page.tsx
git add src/app/headteacher/results/page.tsx
git add src/app/school-admin/results/page.tsx
git commit -m "Fix result pages: Add school info and term filtering for all result pages"
git push -u origin main
echo Deployment complete!
