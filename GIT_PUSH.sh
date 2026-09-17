#!/bin/bash

cd /c/Users/OLU/Desktop/SMS

echo "=========================================="
echo "🚀 Pushing Result Pages Fix to Vercel"
echo "=========================================="
echo ""

# Configure git
git config user.email "sms-deploy@example.com"
git config user.name "SMS Deployment"

# Add files
echo "[1] Staging files..."
git add src/app/api/results/student/\[studentId\]/route.ts
git add src/app/teacher/results/\[studentId\]/page.tsx
git add src/app/principal/results/page.tsx
git add src/app/headteacher/results/page.tsx
git add src/app/school-admin/results/page.tsx
git add "*.md"

# Check status
echo "[2] Files staged:"
git diff --cached --name-only

# Commit
echo ""
echo "[3] Creating commit..."
git commit -m "CRITICAL FIX: Result pages - Proper session/term loading and student display

- Principal/Headteacher/Admin pages now fetch sessions → terms → classes
- All pages auto-load first term and classes on initial load
- Term dropdown properly triggers class and student result loading
- Fixed API calls to include termId for correct filtering
- School branding now displays on all result pages"

# Push
echo ""
echo "[4] Pushing to Vercel..."
git push origin main --force

echo ""
echo "=========================================="
echo "✅ Push Complete! Vercel is deploying..."
echo "=========================================="
echo "Monitor at: https://vercel.com/dashboard"
