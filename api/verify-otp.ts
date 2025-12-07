// Vercel serverless function for verifying OTP
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  try {
    let serviceAccountStr = process.env.FIREBASE_ADMIN_SDK || '{}';
    // Remove surrounding quotes if present (from .env.local format)
    if (serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"')) {
      serviceAccountStr = serviceAccountStr.slice(1, -1);
    }
    // Unescape any escaped quotes
    serviceAccountStr = serviceAccountStr.replace(/\\"/g, '"');
    const serviceAccount = JSON.parse(serviceAccountStr);

    if (serviceAccount && serviceAccount.project_id) {
      initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('verify-otp: Firebase Admin initialized successfully');
    } else {
      console.warn('verify-otp: Invalid FIREBASE_ADMIN_SDK - missing project_id');
    }
  } catch (initError: any) {
    console.error('verify-otp: Firebase Admin initialization error:', initError);
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

  const { mobileNumber, otp } = req.body;
  const MAX_ATTEMPTS = 3;
  
  // Check for development/mock mode
  // TEMPORARILY BYPASSING Fast2SMS - Using mock OTP for all environments
  // To re-enable Fast2SMS: set MOCK_OTP to 'false' and ensure VERCEL_FAST2SMS_API_KEY is set
  const MOCK_OTP = process.env.MOCK_OTP?.trim();
  const isDevelopment = MOCK_OTP !== 'false'; // Always use mock mode unless explicitly disabled
  const MOCK_OTP_CODE = '123456'; // Fixed OTP for testing

  // Debug logging
  console.log('verify-otp: Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    MOCK_OTP: MOCK_OTP,
    MOCK_OTP_type: typeof MOCK_OTP,
    isDevelopment: isDevelopment,
  });

  if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
  }

  if (!otp || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Valid 6-digit OTP is required' });
  }

  // In mock mode, accept the mock OTP directly (works even if Firebase fails)
  if (isDevelopment && otp === MOCK_OTP_CODE) {
    console.log('verify-otp: 🔧 MOCK MODE - Mock OTP verified successfully');
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully (Mock Mode)',
    });
  }

  try {
    // Check if Firebase Admin is initialized
    const apps = getApps();
    if (apps.length === 0) {
      console.warn('verify-otp: Firebase Admin not initialized');
      // In mock mode, still accept the OTP even if Firebase is not available
      if (isDevelopment && otp === MOCK_OTP_CODE) {
        console.log('verify-otp: 🔧 MOCK MODE - Mock OTP verified (Firebase not available)');
        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully (Mock Mode)',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin not initialized. Please check environment variables.',
      });
    }

    const db = getDatabase();
    if (!db) {
      console.warn('verify-otp: Firebase Database not available');
      // In mock mode, still accept the OTP even if Database is not available
      if (isDevelopment && otp === MOCK_OTP_CODE) {
        console.log('verify-otp: 🔧 MOCK MODE - Mock OTP verified (Database not available)');
        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully (Mock Mode)',
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Firebase Database not available. Please check FIREBASE_DATABASE_URL environment variable.',
      });
    }

    const otpRef = db.ref(`otps/${mobileNumber}`);
    const snapshot = await otpRef.once('value');
    const otpData = snapshot.val();

    if (!otpData) {
      // In mock mode, also accept mock OTP even if not in Firebase
      if (isDevelopment && otp === MOCK_OTP_CODE) {
        console.log('verify-otp: 🔧 MOCK MODE - Mock OTP verified (no Firebase record)');
        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully (Mock Mode)',
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'OTP not found or expired. Please request a new OTP.',
      });
    }

    // Check if OTP has expired
    if (Date.now() > otpData.expiresAt) {
      await otpRef.remove(); // Clean up expired OTP
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new OTP.',
      });
    }

    // Check attempt limit
    if (otpData.attempts >= MAX_ATTEMPTS) {
      await otpRef.remove(); // Clean up after max attempts
      return res.status(400).json({
        success: false,
        error: 'Maximum OTP attempts exceeded. Please request a new OTP.',
      });
    }

    // Verify OTP
    if (otpData.otp === otp) {
      // OTP is correct - delete it from Firebase
      await otpRef.remove();

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
      });
    } else {
      // Increment attempt counter
      await otpRef.update({
        attempts: (otpData.attempts || 0) + 1,
      });

      const remainingAttempts = MAX_ATTEMPTS - (otpData.attempts || 0) - 1;

      if (remainingAttempts <= 0) {
        await otpRef.remove(); // Clean up after max attempts
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.',
        });
      }

      return res.status(400).json({
        success: false,
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
        remainingAttempts,
      });
    }
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

