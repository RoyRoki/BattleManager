#!/bin/bash

# Script to verify BREVO API keys are set in both local and Vercel environments
# Usage: ./scripts/verify-brevo-keys.sh

echo "🔍 Verifying BREVO API Key Configuration..."
echo ""

# Check local .env files
echo "📁 Local Environment Files:"
if [ -f ".env.local" ]; then
  if grep -q "VERCEL_BREVO_KEY" .env.local 2>/dev/null; then
    echo "  ✅ .env.local contains VERCEL_BREVO_KEY"
    LOCAL_KEY=$(grep "VERCEL_BREVO_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d '\n' | sed 's/\\n$//' | head -c 20)
    echo "     Key prefix: ${LOCAL_KEY}..."
  else
    echo "  ⚠️  .env.local does NOT contain VERCEL_BREVO_KEY"
  fi
else
  echo "  ⚠️  .env.local file not found"
fi

if [ -f ".env.vercel.production" ]; then
  if grep -q "VERCEL_BREVO_KEY" .env.vercel.production 2>/dev/null; then
    echo "  ✅ .env.vercel.production contains VERCEL_BREVO_KEY"
    PROD_KEY=$(grep "VERCEL_BREVO_KEY" .env.vercel.production | cut -d'=' -f2 | tr -d '"' | tr -d '\n' | sed 's/\\n$//' | head -c 20)
    echo "     Key prefix: ${PROD_KEY}..."
  else
    echo "  ⚠️  .env.vercel.production does NOT contain VERCEL_BREVO_KEY"
  fi
else
  echo "  ⚠️  .env.vercel.production file not found"
fi

echo ""
echo "☁️  Vercel Environment Variables:"
vercel env ls 2>/dev/null | grep -i "VERCEL_BREVO_KEY" | while read -r line; do
  if echo "$line" | grep -q "Production"; then
    echo "  ✅ VERCEL_BREVO_KEY found in Vercel Production"
  elif echo "$line" | grep -q "Preview"; then
    echo "  ✅ VERCEL_BREVO_KEY found in Vercel Preview"
  elif echo "$line" | grep -q "Development"; then
    echo "  ✅ VERCEL_BREVO_KEY found in Vercel Development"
  fi
done

echo ""
echo "📝 Note: Vercel serverless functions (api/send-otp.ts) use Vercel environment variables."
echo "   Local .env files are for reference only - they don't affect Vercel functions."
echo ""
echo "✅ Verification complete!"





