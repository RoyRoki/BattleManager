# Admin Setup Guide

This guide explains how to set up admin users and access the admin panel in BattleManager.

## Quick Fix: "Access denied. Admin privileges required."

If you're seeing this error, it means your user exists in Firebase Auth but doesn't have the admin custom claim set. Here's the fastest way to fix it:

### Option 1: Using the Setup Script (Easiest)

1. **Get your Firebase Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** → **Service Accounts**
   - Click **"Generate new private key"**
   - Save the JSON file as `serviceAccountKey.json` in your project root

2. **Run the setup script:**
   ```bash
   node scripts/setup-admin.js your-email@example.com
   ```

3. **Sign out and sign in again** in the app to refresh your token

### Option 2: Manual Setup via Firebase Console

1. Go to Firebase Console → Authentication → Users
2. Find your user and note their UID
3. Use Firebase Functions or Admin SDK to set the claim (see Step 2 below)

## Overview

BattleManager uses two authentication methods:
- **Regular Users**: OTP-based authentication via mobile number
- **Admins**: Firebase Authentication with email/password and custom claims

## Setting Up an Admin User

### Step 1: Create Admin User in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Click **Add user**
5. Enter:
   - **Email**: Your admin email (e.g., `admin@battlemanager.com`)
   - **Password**: A strong password
6. Click **Add user**

### Step 2: Set Custom Claims (Admin Role)

You need to set the `role: 'admin'` custom claim on the admin user. This can be done in two ways:

#### Option A: Using the Setup Script (Easiest - Recommended)

We've provided a ready-to-use script:

1. **Get your Firebase Service Account Key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in project root

2. **Run the script:**
   ```bash
   node scripts/setup-admin.js admin@battlemanager.com
   ```

3. **Sign out and sign in again** to refresh the token

#### Option B: Using Firebase Admin SDK (Manual)

Create a script or use Firebase Functions:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Set custom claim for admin user
async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    console.log(`Admin claim set for ${email}`);
    console.log('User must sign out and sign in again to refresh token.');
  } catch (error) {
    console.error('Error setting admin claim:', error);
  }
}

// Call with your admin email
setAdminClaim('admin@battlemanager.com');
```

#### Option B: Using Firebase CLI

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Use Firebase Functions to set custom claims (see Firebase documentation)

### Step 3: Verify Admin Setup

After setting custom claims, the user needs to:
1. Sign out (if already signed in)
2. Sign in again to refresh the ID token with new claims

## Accessing the Admin Panel

### Method 1: Via Login Page

1. Navigate to `/login` in your application
2. Click **"Admin Login"** link at the bottom of the login form
3. Enter your admin email and password
4. Click **"Login as Admin"**
5. You will be redirected to `/admin` (Admin Dashboard)

### Method 2: Direct URL (After Login)

Once logged in as admin, you can access:
- **Admin Dashboard**: `/admin`
- **Tournament Management**: `/admin/tournaments`
- **User Management**: `/admin/users`
- **Payment Management**: `/admin/payments`

## Admin Features

Once logged in as admin, you can:

1. **View Dashboard Statistics**:
   - Total tournaments
   - Total users
   - Pending payments

2. **Manage Tournaments**:
   - Create new tournaments
   - Edit existing tournaments
   - View tournament details
   - Manage tournament status

3. **Manage Users**:
   - View all users
   - View user details
   - Manage user points
   - View user enrollment history

4. **Manage Payments**:
   - View pending payment requests
   - Approve or reject payments
   - View payment history

## Security Notes

1. **Custom Claims**: Admin access is controlled via Firebase custom claims (`role: 'admin'`). Only users with this claim can access admin routes.

2. **Firestore Rules**: Admin routes are protected by the `AdminAuth` component which checks for admin status.

3. **Environment Variables**: Ensure your `.env.local` file has:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   ```

4. **Token Refresh**: Custom claims are included in the ID token. If you update claims, users must sign out and sign in again to get a new token.

## Troubleshooting

### "Access denied. Admin privileges required."

- Verify that custom claims are set correctly
- Ensure the user has signed out and signed in again after setting claims
- Check Firebase Console → Authentication → Users → [User] → Custom claims

### "Firebase Auth is not initialized"

- Check your `.env.local` file has all required Firebase config variables
- Ensure `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_AUTH_DOMAIN` are set

### Admin login button not showing

- Clear browser cache and reload
- Check that you're on the `/login` route
- Verify the login page component is properly imported

## Setup Script

A ready-to-use setup script is available at `scripts/setup-admin.js`. It handles:
- ✅ Email validation
- ✅ Service account key detection
- ✅ User lookup
- ✅ Custom claim setting
- ✅ Clear error messages and next steps

**Usage:**
```bash
node scripts/setup-admin.js admin@example.com
```

The script will guide you through any missing steps (like downloading the service account key).

## Support

For issues or questions, refer to:
- Firebase Authentication Documentation: https://firebase.google.com/docs/auth
- Custom Claims Documentation: https://firebase.google.com/docs/auth/admin/custom-claims

