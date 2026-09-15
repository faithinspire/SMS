#!/bin/bash
cd /c/Users/OLU/Desktop/SMS

echo "🔄 Force pushing to GitHub..."
git add -A
git commit -m "fix: teacher registration nested queries and student results auto-loading with CBT" --allow-empty
git push origin main --force

echo "✅ Force push complete"
echo "Vercel should deploy within 2-5 minutes"
