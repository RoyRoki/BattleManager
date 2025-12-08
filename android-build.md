# Android APK Build Instructions

This guide will help you build a signed APK for the BattleManager app using Capacitor.

## Prerequisites

1. **Node.js 18+** - Already installed if you can run `npm run dev`
2. **Android Studio** - Download from [developer.android.com/studio](https://developer.android.com/studio)
3. **Java Development Kit (JDK)** - Android Studio includes this, or install JDK 17+
4. **Production URL** - Your deployed website URL (e.g., `https://your-app.vercel.app`)

## Step 1: Install Dependencies

```bash
npm install
```

This will install Capacitor and all other dependencies.

## Step 2: Configure Production URL

Set your production URL in one of these ways:

**Option A: Environment Variable (Recommended)**
Create or update `.env.local`:
```env
VITE_PRODUCTION_URL=https://your-production-url.vercel.app
```

**Option B: Direct Edit**
Edit `capacitor.config.ts` and update the `productionUrl` variable.

## Step 3: Build Web App

```bash
npm run build
```

This creates the `dist` folder with your production build.

## Step 4: Initialize Capacitor (First Time Only)

If you haven't initialized Capacitor yet:

```bash
npx cap init
```

When prompted:
- **App name**: BattleManager
- **App ID**: com.battlemanager.app
- **Web asset directory**: dist

## Step 5: Add Android Platform

```bash
npx cap add android
```

This creates the `android/` directory with the Android project.

## Step 6: Sync Capacitor

```bash
npm run build:android
```

Or manually:
```bash
npm run build
npx cap sync android
```

This syncs your web build with the Android project.

## Step 7: Configure App Branding

### App Icon

1. Prepare your app icon:
   - Recommended size: 1024x1024px PNG
   - Use `public/applogo.png` or create a new one

2. Generate Android icons:
   - Use an online tool like [icon.kitchen](https://icon.kitchen/) or [appicon.co](https://www.appicon.co/)
   - Or use Android Studio's Image Asset Studio:
     - Open Android Studio
     - Right-click `android/app/src/main/res` → New → Image Asset
     - Select your icon image
     - Generate all densities

3. Replace icons in:
   - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
   - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
   - `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
   - `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)
   - Also create `ic_launcher_round.png` versions for round icons

### App Name

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">BattleManager</string>
</resources>
```

### Package Name

The package name is already set to `com.battlemanager.app` in `capacitor.config.ts`. If you need to change it:

1. Edit `android/app/build.gradle`:
   ```gradle
   android {
       namespace "com.battlemanager.app"
       // ...
   }
   ```

2. Update `capacitor.config.ts`:
   ```typescript
   appId: 'com.battlemanager.app'
   ```

## Step 8: Open in Android Studio

```bash
npm run cap:open
```

Or manually:
```bash
npx cap open android
```

This opens the Android project in Android Studio.

## Step 9: Build APK

### Debug APK (For Testing)

1. In Android Studio, go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for the build to complete
3. Click **locate** in the notification to find your APK
4. Location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (For Distribution)

#### Option A: Unsigned Release APK (Not Recommended for Production)

1. In Android Studio, go to **Build** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Click **Create new...** to create a keystore (or use existing)
4. Fill in keystore details:
   - **Key store path**: Choose a location
   - **Password**: Create a strong password
   - **Key alias**: Create an alias
   - **Key password**: Create a password
   - **Validity**: 25 years (recommended)
   - **Certificate**: Fill in your details
5. Click **OK** and **Next**
6. Select **release** build variant
7. Click **Finish**
8. APK location: `android/app/release/app-release.apk`

#### Option B: Configure Keystore in capacitor.config.ts

1. Create a keystore (if you haven't):
   ```bash
   keytool -genkey -v -keystore battlemanager-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias battlemanager
   ```

2. Update `capacitor.config.ts`:
   ```typescript
   android: {
     buildOptions: {
       keystorePath: 'path/to/battlemanager-release-key.jks',
       keystoreAlias: 'battlemanager',
     },
   },
   ```

3. Create `android/keystore.properties`:
   ```properties
   storePassword=your-keystore-password
   keyPassword=your-key-password
   ```

4. Add to `.gitignore`:
   ```
   *.jks
   keystore.properties
   ```

## Step 10: Test the APK

1. Transfer the APK to your Android device
2. Enable "Install from Unknown Sources" in device settings
3. Install and test the app
4. Verify it loads your production website
5. Test offline detection (turn off WiFi/mobile data)

## Troubleshooting

### Build Errors

- **Gradle sync failed**: Make sure Android Studio is updated and SDK is installed
- **Missing SDK**: Install required SDK versions in Android Studio (SDK Manager)
- **Java version**: Ensure JDK 17+ is installed and configured

### App Not Loading Website

- Check `capacitor.config.ts` has the correct production URL
- Verify the URL is accessible from your device
- Check AndroidManifest.xml has internet permission

### Icon Not Showing

- Ensure icons are in all density folders (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Clean and rebuild: **Build** → **Clean Project**, then **Rebuild Project**

### Offline Banner Not Working

- The offline banner uses browser APIs (`navigator.onLine`)
- Test by disabling WiFi and mobile data on your device
- Check browser console for errors

## Updating the App

Since the app loads the live website, you don't need to rebuild the APK for website updates. However, if you need to:

1. Update app icon/name: Follow Step 7, then rebuild
2. Change production URL: Update `capacitor.config.ts`, then rebuild
3. Update Capacitor: `npm update @capacitor/core @capacitor/cli @capacitor/android`

## Distribution

### Internal Testing
- Share the APK file directly
- Use Google Play Internal Testing track

### Production Release
- Upload to Google Play Console
- Follow Google Play's requirements (privacy policy, app content, etc.)
- Submit for review

## Notes

- The APK always loads the live website (no app updates needed for website changes)
- Users need internet connection to use the app (offline banner shows when disconnected)
- App icon and name are configured in Android resources
- Package name: `com.battlemanager.app`



