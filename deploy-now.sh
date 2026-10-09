#!/bin/bash
# Quick Vercel deployment script

cd "$(dirname "$0")"

echo "🚀 Starting Vercel Deployment..."
echo "================================"

# Check if .vercel exists
if [ ! -f ".vercel/project.json" ]; then
  echo "❌ .vercel/project.json not found"
  exit 1
fi

# Install Vercel CLI globally
echo "📦 Installing Vercel CLI..."
npm install -g vercel

# Deploy to production
echo "🔄 Deploying to Vercel (production)..."
vercel --prod --token "${VERCEL_TOKEN}"

echo ""
echo "================================"
echo "✅ Deployment complete!"
echo ""
echo "🌐 Live at: https://sms-gold-eta.vercel.app"
