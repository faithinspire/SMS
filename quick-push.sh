#!/bin/bash

# Quick push script for Linux/Mac/WSL

cd "c:/Users/OLU/Desktop/SMS"

echo "🚀 School Admin Dashboard - Final Push"
echo ""

# Configure git if needed
git config user.email "dev@school.local"
git config user.name "SMS Developer"

# Add file
echo "📝 Staging file..."
git add "src/app/school-admin/dashboard/page.tsx"

# Commit
echo "✍️  Committing..."
git commit -m "Fix: ALL 7 critical issues - Letters, Edit, Delete, Results, Classes, Real-time Fees, Academic Tab - Syntax errors resolved"

# Push
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deploy triggered!"
echo "⏱️  Vercel deploying now..."
echo "🌐 Check: https://vercel.com/dashboard/projects/sms-gold-eta"
