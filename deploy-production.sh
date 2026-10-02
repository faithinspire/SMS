#!/bin/bash

# Deploy to Vercel Production
# This script deploys the current branch to Vercel production

echo "🚀 Deploying to Vercel Production..."
echo "Current branch: $(git branch --show-current)"
echo "Latest commit: $(git log -1 --oneline)"
echo ""

# Deploy to production
npx vercel deploy --prod --yes --token=$VERCEL_TOKEN 2>&1

echo ""
echo "✅ Deployment complete!"
echo "🌐 Visit: https://sms-sigma-ruby.vercel.app"
