# How to Fix: Still Seeing Mock OTP (123456)

## The Problem
You're still getting the mock OTP response because the API server is running old cached code.

## Solution: Restart the API Server

### Option 1: If using `api-server.js` (Local Development)

1. **Stop the API server** (if running):
   - Find the terminal where `node api-server.js` is running
   - Press `Ctrl+C` to stop it

2. **Restart the API server**:
   ```bash
   node api-server.js
   ```

3. **Restart the frontend** (in another terminal):
   ```bash
   npm run dev
   ```

### Option 2: Use Vercel Dev (Recommended)

1. **Stop any running servers** (`api-server.js` or `npm run dev`)

2. **Start Vercel dev server**:
   ```bash
   vercel dev
   ```
   This will run both the API functions and proxy them correctly.

3. **In another terminal, start the frontend**:
   ```bash
   npm run dev
   ```

### Option 3: Clear Cache and Restart

1. **Clear Node.js cache**:
   ```bash
   rm -rf node_modules/.cache
   ```

2. **Restart the API server**:
   ```bash
   node api-server.js
   ```

3. **Hard refresh browser**:
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

## Verify It's Working

After restarting, check the browser console when requesting OTP. You should see:
- `send-otp: Environment check:` with `hasFast2SMSKey: true`
- `send-otp: Calling Fast2SMS API with:`
- Response should be: `{success: true, message: 'OTP sent successfully'}` (NO mock mode message)

## If Still Not Working

1. **Check if API server is actually running**:
   ```bash
   curl http://localhost:3001/api/send-otp -X POST -H "Content-Type: application/json" -d '{"mobileNumber":"9876543210"}'
   ```

2. **Check the API server terminal** for logs showing:
   - `send-otp: Environment check:`
   - `send-otp: Calling Fast2SMS API with:`

3. **Verify environment variable is loaded**:
   - Check `.env.local` has `VERCEL_FAST2SMS_API_KEY` set
   - The API server should log: `Loaded environment variables from .env.local`

4. **Check Fast2SMS account**:
   - KYC completed?
   - Sufficient balance?
   - API key active?








