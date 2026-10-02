#!/bin/bash

# Read OIDC token from .env.local
OIDC_TOKEN=$(grep VERCEL_OIDC_TOKEN .env.local | cut -d'=' -f2)

if [ -z "$OIDC_TOKEN" ]; then
    echo "❌ VERCEL_OIDC_TOKEN not found in .env.local"
    exit 1
fi

echo "🚀 Triggering Vercel deployment..."
echo ""

# Trigger production deployment
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $OIDC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sms-gold-eta",
    "gitSource": {
      "type": "github",
      "ref": "main",
      "org": "faithinspire",
      "repo": "SMS"
    },
    "target": "production"
  }' \
  -w "\n%{http_code}\n"

echo ""
echo "✅ Deployment triggered!"
echo "📍 Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta"
echo "🌍 Live at: https://sms-gold-eta.vercel.app"
