# API Setup Guide for OTP Flow

## Overview

The OTP flow uses Vercel serverless functions with Firebase Realtime Database for secure OTP generation, storage, and verification.

## Flow Diagram

```
1. Client → POST /api/send-otp { mobileNumber }
   ↓
2. Vercel Function:
   - Generates 6-digit OTP server-side
   - Stores OTP in Firebase Realtime DB (path: otps/{mobileNumber})
   - Stores: { otp, createdAt, expiresAt, attempts }
   - Sends SMS via Fast2SMS API
   ↓
3. User receives SMS with OTP
   ↓
4. Client → POST /api/verify-otp { mobileNumber, otp }
   ↓
5. Vercel Function:
   - Retrieves OTP from Firebase Realtime DB
   - Checks expiry and attempts
   - Verifies OTP
   - Deletes OTP from Firebase (one-time use)
   - Returns success/failure
```

## Environment Variables Setup

### For Vercel Deployment

In Vercel Dashboard → Project Settings → Environment Variables:

1. **VERCEL_FAST2SMS_API_KEY**
   - Your Fast2SMS API key
   - Value: `WmaEdaLAwalWJfMAxAeQ4CnOhblYeWfoo5kQ84aACVTbwP7VMCtuHg9ZhGQv`

2. **FIREBASE_DATABASE_URL**
   - Your Firebase Realtime Database URL
   - Value: `https://battlemanager-2026-default-rtdb.asia-southeast1.firebasedatabase.app`

3. **FIREBASE_ADMIN_SDK**
   - Firebase Admin SDK service account JSON (as string)
   - Get from: Firebase Console → Project Settings → Service Accounts
   - Format: `{"type":"service_account","project_id":"...","private_key":"...",...}`
   - **IMPORTANT**: Convert entire JSON to a single-line string
   - You can use: `JSON.stringify(serviceAccount)` in Node.js

### For Local Development

#### Option 1: Use Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Link your project:
```bash
vercel link
```

4. Run development server:
```bash
vercel dev
```
This runs Vercel functions on port 3001 and proxies them.

5. In another terminal, run Vite dev server:
```bash
npm run dev
```

#### Option 2: Direct Firebase (Without Vercel Functions)

For local testing without Vercel, you can:
1. Use Firebase Emulator Suite
2. Or point API calls directly to deployed Vercel functions

## Firebase Realtime Database Rules

Add these rules to your Firebase Realtime Database:

```json
{
  "rules": {
    "otps": {
      "$mobileNumber": {
        ".read": false,
        ".write": false
      }
    },
    ".read": false,
    ".write": false
  }
}
```

**Note**: Only server-side (Vercel functions with Firebase Admin SDK) can read/write OTPs. Client-side cannot access them.

## API Endpoints

### POST /api/send-otp

**Request:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### POST /api/verify-otp

**Request:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Invalid OTP. 2 attempts remaining.",
  "remainingAttempts": 2
}
```

## Security Features

1. **Server-side OTP Generation**: OTP is generated on Vercel server, never exposed to client
2. **Firebase Storage**: OTP stored securely in Firebase with expiry
3. **Server-side Verification**: Verification happens on server, client cannot bypass
4. **One-time Use**: OTP is deleted after successful verification
5. **Attempt Limiting**: Maximum 3 attempts per OTP
6. **Expiry**: OTP expires after 5 minutes
7. **Auto-cleanup**: Expired OTPs are automatically deleted

## Troubleshooting

### "API proxy error" in development

**Solution**: Run Vercel dev server:
```bash
npx vercel dev
```

### "Firebase Admin SDK not configured"

**Solution**: 
1. Get service account JSON from Firebase Console
2. Convert to single-line string
3. Add as `FIREBASE_ADMIN_SDK` environment variable in Vercel

### "Fast2SMS API key not configured"

**Solution**: Add `VERCEL_FAST2SMS_API_KEY` environment variable in Vercel

### OTP not being sent

**Check**:
1. Fast2SMS API key is valid
2. Mobile number format is correct (10 digits, starts with 6-9)
3. Fast2SMS account has credits
4. Check Vercel function logs for errors

## Testing

### Test Send OTP:
```bash
curl -X POST http://localhost:3001/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}'
```

### Test Verify OTP:
```bash
curl -X POST http://localhost:3001/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210","otp":"123456"}'
```

## Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Firebase Realtime Database rules configured
- [ ] Firebase Admin SDK service account JSON added
- [ ] Fast2SMS API key added
- [ ] Test OTP sending on deployed function
- [ ] Test OTP verification on deployed function

