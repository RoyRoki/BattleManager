#!/bin/bash

# Setup script for Capacitor Android project
# This script initializes Capacitor and sets up the Android project

set -e

echo "🚀 Setting up Capacitor for Android APK..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Check if capacitor.config.ts exists
if [ ! -f "capacitor.config.ts" ]; then
  echo "❌ capacitor.config.ts not found. Please create it first."
  exit 1
fi

# Build the web app first
echo "🏗️  Building web app..."
npm run build

# Check if Android platform already exists
if [ -d "android" ]; then
  echo "⚠️  Android platform already exists. Syncing..."
  npx cap sync android
else
  echo "📱 Initializing Capacitor..."
  npx cap init
  
  echo "📱 Adding Android platform..."
  npx cap add android
  
  echo "🔄 Syncing Capacitor..."
  npx cap sync android
fi

echo "✅ Capacitor setup complete!"
echo ""
echo "Next steps:"
echo "1. Set your production URL in capacitor.config.ts or .env.local (VITE_PRODUCTION_URL)"
echo "2. Configure app icon and branding (see android-build.md)"
echo "3. Run 'npm run cap:open' to open in Android Studio"
echo "4. Build your APK in Android Studio (see android-build.md for details)"









