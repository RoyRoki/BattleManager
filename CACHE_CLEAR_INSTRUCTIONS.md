# Clear Cache Instructions - Fix Timeout Issue

Your browser is serving **old cached JavaScript** from a previous deployment. The error shows "timeout after 10 seconds" but the new code uses 60 seconds.

## Quick Fix (Choose One Method)

### Method 1: Use Clear Cache Page (Easiest)
1. Visit: `https://battlemanager.vercel.app/clear-cache.html`
2. Wait for it to automatically clear cache
3. Then go back to the main site and hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Method 2: Manual Browser Cache Clear

#### Chrome/Edge:
1. Open DevTools (F12)
2. Go to **Application** tab
3. Under **Storage**, click **Clear site data** button
4. Check all boxes and click **Clear site data**
5. Go to **Service Workers** → Click **Unregister** for any workers
6. Go to **Cache Storage** → Right-click each cache → **Delete**
7. Hard refresh: `Ctrl+Shift+R` or `Ctrl+F5`

#### Firefox:
1. Open DevTools (F12)
2. Go to **Storage** tab
3. Expand **Cache Storage** → Delete all caches
4. Expand **Service Workers** → Unregister all
5. Hard refresh: `Ctrl+Shift+R`

#### Safari:
1. Enable Develop menu: Preferences → Advanced → Show Develop menu
2. Develop → Empty Caches
3. Hard refresh: `Cmd+Option+R`

### Method 3: Incognito/Private Window
Open the site in a new incognito/private window to bypass all cache:
- Chrome: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
- Firefox: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)

### Method 4: Clear All Browser Data
1. Chrome: Settings → Privacy → Clear browsing data → Select "Cached images and files" → Clear
2. Firefox: Settings → Privacy → Clear Data → Check "Cached Web Content" → Clear
3. Hard refresh after clearing

## Verify It's Fixed

After clearing cache:
1. Open browser console (F12)
2. Look for Firebase initialization messages:
   - ✅ `All Firebase environment variables are present`
   - ✅ `Firebase app initialized successfully`
3. Try logging in with an existing user
4. Check console - timeout errors should now say "60 seconds" not "10 seconds"

## Why This Happened

The PWA (Progressive Web App) uses a service worker to cache JavaScript files for offline use. When we deployed new code, your browser was still serving the old cached version. Clearing the cache forces the browser to download the latest JavaScript files.

## Still Not Working?

1. Check the deployment URL matches: `https://battlemanager.vercel.app`
2. Verify you're using the latest deployment (check Vercel dashboard)
3. Try a different browser to rule out browser-specific cache issues
4. Check if corporate proxy/VPN is caching the site

