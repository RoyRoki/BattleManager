#!/bin/bash

# Script to add BREVO environment variables to Vercel
# Usage: ./add-brevo-keys.sh <BREVO_API_KEY> <BREVO_SMTP_KEY>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./add-brevo-keys.sh <VERCEL_BREVO_KEY> <VERCEL_BREVO_SMTP_KEY>"
  echo "Example: ./add-brevo-keys.sh 'xkeysib-xxxxx' 'smtp-key-xxxxx'"
  exit 1
fi

BREVO_KEY="$1"
BREVO_SMTP_KEY="$2"

echo "Adding VERCEL_BREVO_KEY to Vercel production..."
echo "$BREVO_KEY" | vercel env add VERCEL_BREVO_KEY production

echo ""
echo "Adding VERCEL_BREVO_SMTP_KEY to Vercel production..."
echo "$BREVO_SMTP_KEY" | vercel env add VERCEL_BREVO_SMTP_KEY production

echo ""
echo "✅ BREVO keys added successfully!"
echo "⚠️  Note: You may need to redeploy for changes to take effect."
echo "Run: vercel --prod"









