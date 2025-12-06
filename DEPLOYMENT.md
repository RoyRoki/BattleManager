# Vercel Deployment Guide

This guide will help you deploy BattleManager to Vercel, including the frontend and serverless functions.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed (optional, for CLI deployment)
3. All environment variables ready

## Step 1: Install Vercel CLI (Optional)

If you prefer using the CLI:

```bash
npm install -g vercel
```

## Step 2: Prepare Environment Variables

Before deploying, you need to set up the following environment variables in Vercel:

### Required Environment Variables

1. **Firebase Configuration** (from your Firebase project):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_DATABASE_URL`

2. **Firebase Admin SDK** (for serverless functions):
   - `FIREBASE_ADMIN_SDK` - JSON string of your Firebase service account key
   - `FIREBASE_DATABASE_URL` - Your Firebase Realtime Database URL

3. **Fast2SMS API** (for OTP):
   - `VERCEL_FAST2SMS_API_KEY` - Your Fast2SMS API key

4. **Cloudinary** (for image uploads):
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`

5. **Encryption**:
   - `VITE_ENCRYPTION_KEY` - Your encryption key for credentials

6. **Admin Email**:
   - `VITE_ADMIN_EMAIL` - Admin email for authentication

### Optional Environment Variables

- `MOCK_OTP` - Set to `"true"` for development/testing (uses mock OTP: 123456)
- `NODE_ENV` - Set to `"production"` for production

## Step 3: Deploy via Vercel Dashboard

### Method 1: GitHub Integration (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project in Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the Vite framework

3. **Configure Project Settings**:
   - Framework Preset: Vite
   - Root Directory: `./` (root)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**:
   - In the project settings, go to "Environment Variables"
   - Add all the required environment variables listed above
   - Make sure to add them for all environments (Production, Preview, Development)

5. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete

### Method 2: Vercel CLI

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Add Environment Variables**:
   ```bash
   vercel env add VITE_FIREBASE_API_KEY
   vercel env add FIREBASE_ADMIN_SDK
   # ... add all other environment variables
   ```

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Step 4: Verify Environment Variables

After deployment, verify that all environment variables are correctly set:

1. **Check Browser Console**:
   - Open your deployed application
   - Open browser DevTools (F12)
   - Check the Console tab for Firebase initialization messages
   - Look for:
     - ✅ `All Firebase environment variables are present`
     - ✅ `Firebase app initialized successfully`
     - ✅ `Firestore initialized successfully`
   - If you see warnings about missing variables, add them in Vercel dashboard

2. **Verify Required Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify all `VITE_FIREBASE_*` variables are set
   - Ensure they match your local `.env.local` values
   - Check that variables are enabled for Production environment

3. **Common Issues**:
   - If Firebase initialization fails, check that all 7 Firebase variables are set
   - If you see "Firestore not initialized" errors, verify `VITE_FIREBASE_PROJECT_ID` is set
   - If Realtime Database doesn't work, verify `VITE_FIREBASE_DATABASE_URL` is set

4. **After Adding/Updating Variables**:
   - **Important**: You must redeploy after adding or updating environment variables
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger automatic deployment

## Step 5: Verify Deployment

1. **Check API Endpoints**:
   - `https://your-project.vercel.app/api/send-otp`
   - `https://your-project.vercel.app/api/verify-otp`

2. **Test the Application**:
   - Visit your deployed URL
   - Test OTP functionality
   - Verify Firebase connections (check browser console)
   - Test image uploads
   - Check that existing users can login (should not show signup page)

## Step 6: Update Firebase Configuration

After deployment, update your Firebase configuration:

1. **Firestore Rules**: Ensure your Firestore rules allow access from your Vercel domain
2. **Realtime Database Rules**: Update rules if needed
3. **Authorized Domains**: Add your Vercel domain to Firebase authorized domains

## Troubleshooting

### API Functions Not Working

1. Check that `@vercel/node` is in your `package.json` devDependencies
2. Verify environment variables are set correctly
3. Check Vercel function logs in the dashboard

### Build Errors

1. Ensure all dependencies are in `package.json`
2. Check that TypeScript compilation passes: `npm run build`
3. Review build logs in Vercel dashboard

### Environment Variables Not Loading

1. Ensure variables are prefixed correctly:
   - Client-side: `VITE_*`
   - Serverless: No prefix (or `VERCEL_*` for Vercel-specific)
2. Redeploy after adding new environment variables (variables are bundled at build time)
3. Check variable names match exactly (case-sensitive)
4. Verify variables are enabled for the correct environment (Production/Preview/Development)

### Firebase Connection Timeout in Production

If you see timeout errors when checking if users exist:

1. **Check Environment Variables**:
   - Verify all `VITE_FIREBASE_*` variables are set in Vercel
   - Check browser console for initialization errors
   - Look for warnings about missing variables

2. **Network Latency**:
   - Production has higher latency than localhost
   - Timeout is set to 60 seconds (1 minute) with 3 retry attempts
   - Check browser Network tab to see actual request times

3. **Clear Browser Cache**:
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear service worker cache
   - Old cached code might have shorter timeouts

4. **Check Firebase Console**:
   - Verify Firestore rules allow read access
   - Check if Firebase project has any restrictions
   - Verify your Vercel domain is authorized in Firebase

### CORS Issues

The API functions already include CORS headers. If you encounter CORS issues:
1. Check that the API routes are correctly configured in `vercel.json`
2. Verify the `Access-Control-Allow-Origin` header is set correctly

## Continuous Deployment

Once connected to GitHub, Vercel will automatically deploy:
- **Production**: On push to `main` branch
- **Preview**: On push to other branches or pull requests

## Custom Domain

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

## Monitoring

- View function logs in Vercel Dashboard → Functions
- Monitor performance in Analytics
- Set up alerts for errors

## Notes

- The `vercel.json` file is already configured for this project
- API functions are in the `api/` directory
- Serverless functions use `@vercel/node` runtime
- PWA service worker is configured for offline support

