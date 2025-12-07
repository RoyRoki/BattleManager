#!/bin/bash

# Script to add environment variables to Vercel
# Usage: ./scripts/setup-vercel-env.sh

echo "🚀 Setting up Vercel Environment Variables"
echo "=========================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "   npm install -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login first:"
    echo "   vercel login"
    exit 1
fi

echo "✅ Vercel CLI is ready"
echo ""

# Function to add environment variable
add_env_var() {
    local var_name=$1
    local var_value=$2
    local environments=$3
    
    echo "Adding: $var_name"
    echo "$var_value" | vercel env add "$var_name" "$environments" < /dev/tty
    echo ""
}

# Client-side environment variables (VITE_*)
echo "📦 Adding Client-side Environment Variables (VITE_*)..."
echo "These will be available in Production, Preview, and Development"
echo ""

add_env_var "VITE_FIREBASE_API_KEY" "AIzaSyAP2whnBoq3dqb97f1v5nbjZp6X-RZ67ak" "production preview development"
add_env_var "VITE_FIREBASE_AUTH_DOMAIN" "battlemanager-2026.firebaseapp.com" "production preview development"
add_env_var "VITE_FIREBASE_PROJECT_ID" "battlemanager-2026" "production preview development"
add_env_var "VITE_FIREBASE_STORAGE_BUCKET" "battlemanager-2026.firebasestorage.app" "production preview development"
add_env_var "VITE_FIREBASE_MESSAGING_SENDER_ID" "957958195894" "production preview development"
add_env_var "VITE_FIREBASE_APP_ID" "1:957958195894:web:fff5fcef3e75b604ff3417" "production preview development"
add_env_var "VITE_FIREBASE_MEASUREMENT_ID" "G-MEGTCKCQGK" "production preview development"
add_env_var "VITE_FIREBASE_DATABASE_URL" "https://battlemanager-2026-default-rtdb.asia-southeast1.firebasedatabase.app" "production preview development"
add_env_var "VITE_CLOUDINARY_CLOUD_NAME" "dtgvwk7ss" "production preview development"
add_env_var "VITE_CLOUDINARY_UPLOAD_PRESET" "battlemanager_preset" "production preview development"
add_env_var "VITE_ADMIN_EMAIL" "admin@battlemanager.com" "production preview development"
add_env_var "VITE_ENCRYPTION_KEY" "battlemanager-secret-key-2026" "production preview development"

# Server-side environment variables (for API functions)
echo "🔐 Adding Server-side Environment Variables..."
echo "These are only available in serverless functions"
echo ""

add_env_var "FIREBASE_DATABASE_URL" "https://battlemanager-2026-default-rtdb.asia-southeast1.firebasedatabase.app" "production preview development"
add_env_var "VERCEL_FAST2SMS_API_KEY" "WmaEdaLAwalWJfMAxAeQ4CnOhblYeWfoo5kQ84aACVTbwP7VMCtuHg9ZhGQv" "production preview development"

# Check for Firebase Admin SDK
if [ -f "serviceAccountKey.json" ]; then
    echo "📄 Found serviceAccountKey.json"
    echo "Adding FIREBASE_ADMIN_SDK (this will require manual input)..."
    echo ""
    echo "Please paste the JSON content as a single-line string when prompted:"
    echo ""
    
    # Convert JSON to single-line string
    FIREBASE_ADMIN_SDK=$(cat serviceAccountKey.json | jq -c . 2>/dev/null || cat serviceAccountKey.json | tr -d '\n' | sed 's/"/\\"/g')
    
    if [ -n "$FIREBASE_ADMIN_SDK" ]; then
        echo "$FIREBASE_ADMIN_SDK" | vercel env add "FIREBASE_ADMIN_SDK" "production preview development" < /dev/tty
        echo ""
    else
        echo "⚠️  Could not parse serviceAccountKey.json automatically"
        echo "Please add FIREBASE_ADMIN_SDK manually:"
        echo "   vercel env add FIREBASE_ADMIN_SDK"
        echo ""
    fi
else
    echo "⚠️  serviceAccountKey.json not found"
    echo "Please add FIREBASE_ADMIN_SDK manually:"
    echo "   1. Get your service account JSON from Firebase Console"
    echo "   2. Convert it to a single-line string"
    echo "   3. Run: vercel env add FIREBASE_ADMIN_SDK"
    echo ""
fi

echo "✅ Environment variables setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify all variables were added: vercel env ls"
echo "2. Deploy to production: vercel --prod"
echo ""

