import { CapacitorConfig } from '@capacitor/cli';

// IMPORTANT: Update this URL to your production website URL
// Example: 'https://battlemanager.vercel.app'
// The APK will load this URL directly - no app updates needed for website changes
const productionUrl = 'https://battlemanager.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.battlemanager.app',
  appName: 'BattleManager',
  webDir: 'dist',
  server: {
    // When building for production, this will load the live website
    // No APK updates needed - always shows latest version
    url: productionUrl,
    cleartext: false, // Use HTTPS only
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Set path to keystore for release builds
      keystoreAlias: undefined, // Set keystore alias for release builds
    },
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;

