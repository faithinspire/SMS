#!/bin/bash
# Deployment Script - Copy & Paste This

cd c:\Users\OLU\Desktop\SMS

echo "=== SMS VERCEL DEPLOYMENT ==="
echo ""
echo "Step 1: Configure Git"
git config user.email "deploy@schoolms.app"
git config user.name "Auto Deploy Bot"
echo "✅ Git configured"
echo ""

echo "Step 2: Stage All Changes"
git add -A
echo "✅ Changes staged"
echo ""

echo "Step 3: Commit"
git commit -m "🎯 Auto-initialize schools + teacher registration fix + class-combos fix (migration 172 + 3 APIs)"
echo "✅ Changes committed"
echo ""

echo "Step 4: Push to GitHub (Vercel auto-deploys)"
git push origin main
echo "✅ Pushed to GitHub"
echo ""

echo "=== DEPLOYMENT INITIATED ==="
echo "Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta"
echo ""
echo "Timeline:"
echo "  NOW:      Push sent"
echo "  +30 sec:  GitHub receives"
echo "  +1 min:   Vercel webhook triggered"
echo "  +2 min:   Build starts"
echo "  +5-7 min: Build completes"
echo "  +7 min:   🎉 LIVE"
echo ""
echo "Next: Run Supabase migration 172"
