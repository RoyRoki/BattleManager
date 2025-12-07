#!/bin/bash

# Script to add environment variables to Vercel
# This script will prompt you for each variable

echo "🚀 Adding Environment Variables to Vercel"
echo "=========================================="
echo ""

# Array of environment variables
declare -A env_vars=(
    ["VITE_FIREBASE_API_KEY"]="AIzaSyAP2whnBoq3dqb97f1v5nbjZp6X-RZ67ak"
    ["VITE_FIREBASE_AUTH_DOMAIN"]="battlemanager-2026.firebaseapp.com"
    ["VITE_FIREBASE_PROJECT_ID"]="battlemanager-2026"
    ["VITE_FIREBASE_STORAGE_BUCKET"]="battlemanager-2026.firebasestorage.app"
    ["VITE_FIREBASE_MESSAGING_SENDER_ID"]="957958195894"
    ["VITE_FIREBASE_APP_ID"]="1:957958195894:web:fff5fcef3e75b604ff3417"
    ["VITE_FIREBASE_MEASUREMENT_ID"]="G-MEGTCKCQGK"
    ["VITE_FIREBASE_DATABASE_URL"]="https://battlemanager-2026-default-rtdb.asia-southeast1.firebasedatabase.app"
    ["VITE_CLOUDINARY_CLOUD_NAME"]="dtgvwk7ss"
    ["VITE_CLOUDINARY_UPLOAD_PRESET"]="battlemanager_preset"
    ["VITE_ADMIN_EMAIL"]="admin@battlemanager.com"
    ["VITE_ENCRYPTION_KEY"]="battlemanager-secret-key-2026"
)

echo "Adding client-side environment variables (VITE_*)..."
echo ""

for var_name in "${!env_vars[@]}"; do
    var_value="${env_vars[$var_name]}"
    echo "Adding $var_name..."
    
    # Add for production
    echo "$var_value" | vercel env add "$var_name" production
    # Add for preview
    echo "$var_value" | vercel env add "$var_name" preview
    # Add for development
    echo "$var_value" | vercel env add "$var_name" development
    
    echo "✅ $var_name added"
    echo ""
done

echo "✅ All environment variables added!"
echo ""
echo "To verify, run: vercel env ls"

