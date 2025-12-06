# How to Clear Cache and See Orange Theme

The code has been updated to use orange (#FFBA00) instead of green. If you're still seeing green colors, follow these steps:

## Method 1: Clear Service Worker Cache (Recommended for PWA)

1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click on **Service Workers** in the left sidebar
4. Click **Unregister** for any registered service workers
5. Go to **Cache Storage** in the left sidebar
6. Right-click and select **Delete** for all caches
7. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Method 2: Hard Refresh

- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

## Method 3: Clear Browser Cache

### Chrome:
1. Settings → Privacy and Security → Clear browsing data
2. Select "Cached images and files"
3. Click "Clear data"

### Firefox:
1. Settings → Privacy & Security → Cookies and Site Data
2. Click "Clear Data"
3. Check "Cached Web Content"

### Safari:
1. Develop → Empty Caches (enable Develop menu in Preferences first)

## Method 4: Incognito/Private Window

Open the site in an incognito/private window to bypass cache completely.

## Method 5: If Running Dev Server

1. Stop the dev server (Ctrl+C)
2. Delete cache: `rm -rf node_modules/.vite .vite dist`
3. Restart: `npm run dev`

## Verify the Change

After clearing cache, you should see:
- Orange buttons (#FFBA00) instead of green
- Orange borders and accents in orange
- Orange text highlights in orange

The CSS file `dist/assets/index-YjxIadkk.css` contains:
- `border-primary`: `rgb(255 186 0)` (orange)
- `bg-primary`: `rgb(255 186 0)` (orange)  
- `text-primary`: `rgb(255 186 0)` (orange)

