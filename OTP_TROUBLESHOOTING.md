# OTP Troubleshooting Guide

## Issue: Not Receiving OTP on Mobile

If you're not receiving OTPs on your mobile number, follow these steps:

### 1. Check if Running Locally

**If testing locally**, you MUST run Vercel dev server for API functions to work:

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Run Vercel dev server (in one terminal)
vercel dev

# In another terminal, run the frontend
npm run dev
```

The API functions (`/api/send-otp` and `/api/verify-otp`) only work when:
- Deployed on Vercel, OR
- Running via `vercel dev` locally

### 2. Verify Environment Variables

Check that `VERCEL_FAST2SMS_API_KEY` is set:

**For Local Development:**
- Create `.env.local` file in project root
- Add: `VERCEL_FAST2SMS_API_KEY="your-api-key-here"`
- Restart `vercel dev` after adding

**For Vercel Deployment:**
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Ensure `VERCEL_FAST2SMS_API_KEY` is set
- Redeploy after adding/updating

### 3. Check Fast2SMS Account

1. **KYC Status**: Fast2SMS requires KYC completion to send OTPs
   - Login to Fast2SMS dashboard
   - Complete KYC (may require ₹100 transaction + Aadhaar verification)
   - Check account status

2. **Account Balance**: Ensure you have sufficient credits
   - Check Fast2SMS dashboard for balance
   - OTP messages consume credits

3. **API Key Validity**: Verify your API key is active
   - Login to Fast2SMS dashboard
   - Go to API section
   - Verify key is active and not expired

### 4. Check Browser Console & Network Tab

1. Open browser DevTools (F12)
2. Go to Console tab - look for errors
3. Go to Network tab - check `/api/send-otp` request:
   - Status should be 200
   - Response should show `success: true`
   - Check for error messages

### 5. Check Vercel Function Logs

**If deployed on Vercel:**
- Go to Vercel Dashboard → Your Project → Functions
- Click on `api/send-otp`
- Check logs for errors

**If running locally with `vercel dev`:**
- Check the terminal where `vercel dev` is running
- Look for console logs showing:
  - `send-otp: Environment check:`
  - `send-otp: Calling Fast2SMS API with:`
  - `send-otp: Fast2SMS API response:`

### 6. Test Fast2SMS API Directly

Test if Fast2SMS API is working:

```bash
curl -X POST https://www.fast2sms.com/dev/bulkV2 \
  -H "Content-Type: application/json" \
  -H "authorization: YOUR_API_KEY" \
  -d '{
    "route": "q",
    "message": "Test OTP: 123456",
    "numbers": "9876543210"
  }'
```

Replace:
- `YOUR_API_KEY` with your Fast2SMS API key
- `9876543210` with your mobile number

### 7. Common Error Codes

- **Error 996**: KYC not completed - Complete KYC in Fast2SMS dashboard
- **Error 401**: Invalid API key - Check your API key
- **Error 402**: Insufficient balance - Add credits to Fast2SMS account
- **Error 403**: Account suspended - Contact Fast2SMS support

### 8. Verify Code Changes

Ensure the code is using Fast2SMS (not mock mode):

1. Check `api/send-otp.ts`:
   - Should NOT have `MOCK_OTP` checks
   - Should call Fast2SMS API
   - Should generate random OTP (not hardcoded "123456")

2. Check `api/verify-otp.ts`:
   - Should NOT accept "123456" as valid OTP
   - Should verify against Firebase-stored OTP

### 9. Mobile Number Format

Ensure mobile number is:
- Exactly 10 digits
- Starts with 6, 7, 8, or 9
- No country code prefix (e.g., no +91)

### 10. Still Not Working?

1. Check Vercel function logs for detailed error messages
2. Verify Fast2SMS account is active and has balance
3. Test with a different mobile number
4. Contact Fast2SMS support if API is failing
5. Check if your mobile number is DND (Do Not Disturb) registered

## Quick Checklist

- [ ] Running `vercel dev` locally OR deployed on Vercel
- [ ] `VERCEL_FAST2SMS_API_KEY` environment variable is set
- [ ] Fast2SMS account has completed KYC
- [ ] Fast2SMS account has sufficient balance
- [ ] Mobile number format is correct (10 digits, starts with 6-9)
- [ ] No errors in browser console
- [ ] No errors in Vercel function logs
- [ ] Code is using Fast2SMS (not mock mode)

