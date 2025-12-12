# Capacitor Setup Guide

This guide will help you set up Capacitor to build an Android APK for BattleManager.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs Capacitor and all required dependencies.

### 2. Set Production URL

**Option A: Environment Variable (Recommended)**

Create or update `.env.local`:
```env
VITE_PRODUCTION_URL=https://your-production-url.vercel.app
```

**Option B: Direct Configuration**

Edit `capacitor.config.ts` and update the `productionUrl` variable on line 4.

### 3. Build Web App

```bash
npm run build
```

### 4. Initialize Capacitor

Run the setup script:
```bash
chmod +x scripts/setup-capacitor.sh
./scripts/setup-capacitor.sh
```

Or manually:
```bash
# Initialize Capacitor (first time only)
npx cap init

# When prompted:
# - App name: BattleManager
# - App ID: com.battlemanager.app
# - Web asset directory: dist

# Add Android platform
npx cap add android

# Sync
npx cap sync android
```

### 5. Configure App Branding

#### App Icon

1. Ensure you have `public/applogo.png` (1024x1024px recommended)

2. Generate Android icons using one of these methods:

   **Method A: Online Tool**
   - Visit [icon.kitchen](https://icon.kitchen/) or [appicon.co](https://www.appicon.co/)
   - Upload your `applogo.png`
   - Download the generated Android icon set
   - Extract and copy to `android/app/src/main/res/`:
     - `mipmap-mdpi/ic_launcher.png` (48x48)
     - `mipmap-hdpi/ic_launcher.png` (72x72)
     - `mipmap-xhdpi/ic_launcher.png` (96x96)
     - `mipmap-xxhdpi/ic_launcher.png` (144x144)
     - `mipmap-xxxhdpi/ic_launcher.png` (192x192)
   - Also create round versions: `ic_launcher_round.png` in each folder

   **Method B: Android Studio**
   - Open Android Studio
   - Right-click `android/app/src/main/res` → New → Image Asset
   - Select your icon image
   - Generate all densities

#### App Name

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">BattleManager</string>
</resources>
```

### 6. Open in Android Studio

```bash
npm run cap:open
```

Or:
```bash
npx cap open android
```

### 7. Build APK

See [android-build.md](./android-build.md) for detailed build instructions.

## Configuration Files

### capacitor.config.ts

The main Capacitor configuration file. Key settings:

- `appId`: Package name (com.battlemanager.app)
- `appName`: Display name (BattleManager)
- `webDir`: Web build directory (dist)
- `server.url`: Production website URL
- `server.cleartext`: HTTPS only (false)

### Environment Variables

- `VITE_PRODUCTION_URL`: Your deployed website URL

## Project Structure

After setup, you'll have:

```
BattleManager/
├── android/                 # Android project (generated)
│   └── app/
│       └── src/
│           └── main/
│               ├── res/     # App icons, strings, etc.
│               └── java/     # MainActivity.java
├── capacitor.config.ts       # Capacitor config
├── dist/                    # Web build (generated)
└── ...
```

## Common Commands

```bash
# Build web app and sync with Android
npm run build:android

# Sync Capacitor (after web build)
npm run cap:sync

# Open Android Studio
npm run cap:open

# Build web app only
npm run build
```

## Troubleshooting

### "Capacitor not found"
Run `npm install` to install dependencies.

### "Android platform not found"
Run `npx cap add android` to add the platform.

### "Build failed"
1. Make sure you've run `npm run build` first
2. Check that `dist/` folder exists
3. Run `npx cap sync android` to sync

### "App not loading website"
1. Check `capacitor.config.ts` has correct production URL
2. Verify URL is accessible (test in browser)
3. Check AndroidManifest.xml has internet permission (should be automatic)

## Next Steps

1. ✅ Install dependencies
2. ✅ Set production URL
3. ✅ Initialize Capacitor
4. ✅ Configure app branding
5. 📱 Build APK (see [android-build.md](./android-build.md))

## Notes

- The APK loads the live website - no app updates needed for website changes
- App icon and name are configured in Android resources
- Offline detection is handled by the `OfflineBanner` component
- Package name: `com.battlemanager.app`








