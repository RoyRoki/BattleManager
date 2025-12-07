# Quick Start: Building Android APK

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Android Studio installed ([download](https://developer.android.com/studio))
- [ ] Production website URL ready (e.g., `https://your-app.vercel.app`)

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Production URL

Create `.env.local`:
```env
VITE_PRODUCTION_URL=https://your-production-url.vercel.app
```

Or edit `capacitor.config.ts` directly.

### 3. Build & Setup Capacitor
```bash
# Build web app
npm run build

# Initialize Capacitor (first time only)
npx cap init
# When prompted: App name = BattleManager, App ID = com.battlemanager.app, Web dir = dist

# Add Android platform
npx cap add android

# Sync
npx cap sync android
```

Or use the setup script:
```bash
chmod +x scripts/setup-capacitor.sh
./scripts/setup-capacitor.sh
```

### 4. Configure App Icon

1. Use `public/applogo.png` (or your own 1024x1024px icon)
2. Generate Android icons using [icon.kitchen](https://icon.kitchen/)
3. Copy generated icons to `android/app/src/main/res/mipmap-*/`

See [android-build.md](./android-build.md) for detailed icon setup.

### 5. Open in Android Studio
```bash
npm run cap:open
```

### 6. Build APK

In Android Studio:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. For release: **Build** → **Generate Signed Bundle / APK**

See [android-build.md](./android-build.md) for detailed build instructions.

## What's Included

✅ **Offline Detection** - Shows banner when user is offline  
✅ **App Branding** - Configure icon and name  
✅ **WebView Wrapper** - Loads your live website  
✅ **No Updates Needed** - Always shows latest website version  

## Important Notes

- The APK loads your **live website** - no app updates needed for website changes
- Users need internet connection (offline banner shows when disconnected)
- App package: `com.battlemanager.app`
- App name: `BattleManager`

## Troubleshooting

**"Capacitor not found"** → Run `npm install`  
**"Android platform not found"** → Run `npx cap add android`  
**"App not loading"** → Check `VITE_PRODUCTION_URL` in `.env.local` or `capacitor.config.ts`

## Full Documentation

- [CAPACITOR_SETUP.md](./CAPACITOR_SETUP.md) - Detailed setup guide
- [android-build.md](./android-build.md) - Complete build instructions

