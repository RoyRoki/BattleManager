// Vercel serverless function for sending OTP via Fast2SMS
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  try {
    let serviceAccountStr = process.env.FIREBASE_ADMIN_SDK;
    if (!serviceAccountStr) {
      console.warn('send-otp: FIREBASE_ADMIN_SDK environment variable not set');
    } else {
      // Remove surrounding quotes if present (from .env.local format)
      if (serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"')) {
        serviceAccountStr = serviceAccountStr.slice(1, -1);
      }
      // Unescape any escaped quotes
      serviceAccountStr = serviceAccountStr.replace(/\\"/g, '"');
      const serviceAccount = JSON.parse(serviceAccountStr);

      if (serviceAccount && serviceAccount.project_id) {
        const databaseURL = process.env.FIREBASE_DATABASE_URL;
        if (!databaseURL) {
          console.warn('send-otp: FIREBASE_DATABASE_URL environment variable not set');
        }

        initializeApp({
          credential: cert(serviceAccount as any),
          databaseURL: databaseURL,
        });
        console.log('send-otp: Firebase Admin initialized successfully');
      } else {
        console.warn('send-otp: Invalid FIREBASE_ADMIN_SDK - missing project_id');
      }
    }
  } catch (initError: any) {
    console.error('send-otp: Firebase Admin initialization error:', initError);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mobileNumber } = req.body;

  if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
  }

  const FAST2SMS_API_KEY = process.env.VERCEL_FAST2SMS_API_KEY;
  const OTP_EXPIRY_MINUTES = 5;
  
  // Check for development/mock mode
  // TEMPORARILY BYPASSING Fast2SMS - Using mock OTP for all environments
  // To re-enable Fast2SMS: set MOCK_OTP to 'false' and ensure VERCEL_FAST2SMS_API_KEY is set
  const MOCK_OTP = process.env.MOCK_OTP?.trim();
  const isDevelopment = MOCK_OTP !== 'false'; // Always use mock mode unless explicitly disabled
  const MOCK_OTP_CODE = '123456'; // Fixed OTP for testing

  // Debug logging
  console.log('send-otp: Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    MOCK_OTP: MOCK_OTP,
    MOCK_OTP_type: typeof MOCK_OTP,
    isDevelopment: isDevelopment,
    hasFast2SMSKey: !!FAST2SMS_API_KEY,
  });

  // If mock mode is enabled, skip Fast2SMS entirely
  if (isDevelopment) {
    const otp = MOCK_OTP_CODE;
    const expiryTime = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

    console.log('send-otp: 🔧 MOCK MODE - Using mock OTP:', otp);
    console.log('send-otp: 📱 Mobile:', mobileNumber);

    // Store OTP in Firebase Realtime Database (optional, for consistency)
    try {
      const db = getDatabase();
      if (db) {
        const otpRef = db.ref(`otps/${mobileNumber}`);
        await otpRef.set({
          otp: otp,
          createdAt: Date.now(),
          expiresAt: expiryTime,
          attempts: 0,
        });

        // Auto-delete OTP after expiry
        setTimeout(async () => {
          try {
            await otpRef.remove();
          } catch (err) {
            console.error('Error deleting expired OTP:', err);
          }
        }, OTP_EXPIRY_MINUTES * 60 * 1000);
      }
    } catch (firebaseError: any) {
      console.warn('send-otp: Firebase error (continuing in mock mode):', firebaseError.message);
      // Continue even if Firebase fails
    }

    console.log('send-otp: ✅ Mock OTP "sent" successfully (no actual SMS)');
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully (Mock Mode - Use code: 123456)',
      _devOtp: otp, // Show OTP in response for testing
    });
  }

  // Production mode - require Fast2SMS API key
  if (!FAST2SMS_API_KEY) {
    console.error('send-otp: Missing VERCEL_FAST2SMS_API_KEY environment variable');
    return res.status(500).json({ 
      success: false,
      error: 'Fast2SMS API key not configured. Please set VERCEL_FAST2SMS_API_KEY environment variable.' 
    });
  }

  try {
    // Production mode - generate random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

    // Store OTP in Firebase Realtime Database
    try {
      const db = getDatabase();
      if (db) {
        const otpRef = db.ref(`otps/${mobileNumber}`);
        await otpRef.set({
          otp: otp,
          createdAt: Date.now(),
          expiresAt: expiryTime,
          attempts: 0,
        });

        // Auto-delete OTP after expiry
        setTimeout(async () => {
          try {
            await otpRef.remove();
          } catch (err) {
            console.error('Error deleting expired OTP:', err);
          }
        }, OTP_EXPIRY_MINUTES * 60 * 1000);
      }
    } catch (firebaseError: any) {
      console.warn('send-otp: Firebase error (continuing):', firebaseError.message);
      // Continue even if Firebase fails
    }

    // Send OTP via Fast2SMS (production mode)
    let smsData: any;
    try {
      const smsResponse = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: FAST2SMS_API_KEY!,
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: mobileNumber,
        }),
      });

      if (!smsResponse.ok) {
        console.error('send-otp: Fast2SMS API returned non-OK status:', smsResponse.status);
        const errorText = await smsResponse.text();
        console.error('send-otp: Fast2SMS error response:', errorText);
        throw new Error(`Fast2SMS API error: ${smsResponse.status} - ${errorText}`);
      }

      smsData = await smsResponse.json();
      console.log('send-otp: Fast2SMS response:', smsData);
    } catch (fetchError: any) {
      console.error('send-otp: Error calling Fast2SMS API:', fetchError);
      // Clean up Firebase entry if SMS failed
      try {
        const db = getDatabase();
        if (db) {
          await db.ref(`otps/${mobileNumber}`).remove();
        }
      } catch (err) {
        // Ignore cleanup errors
      }

      return res.status(500).json({
        success: false,
        error: `Failed to send OTP via SMS: ${fetchError.message}`,
      });
    }

    if (smsData.return === true) {
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        // Don't send OTP back to client for security
      });
    } else {
      // Clean up Firebase entry if SMS failed
      try {
        const db = getDatabase();
        if (db) {
          await db.ref(`otps/${mobileNumber}`).remove();
        }
      } catch (err) {
        // Ignore cleanup errors
      }

      console.error('send-otp: Fast2SMS returned failure:', smsData);
      return res.status(400).json({
        success: false,
        error: smsData.message || 'Failed to send OTP via SMS',
        details: smsData,
      });
    }
  } catch (error: any) {
    console.error('send-otp: Unexpected error:', error);
    console.error('send-otp: Error stack:', error.stack);
    console.error('send-otp: Error name:', error.name);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
