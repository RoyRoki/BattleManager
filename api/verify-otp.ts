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

  const { email, otp } = req.body;
  const MAX_ATTEMPTS = 3;

  // Debug logging
  console.log('verify-otp: Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
  });

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  // Normalize email (lowercase) for storage lookup
  const normalizedEmail = email.toLowerCase().trim();

  // Encode email for Firebase Realtime Database path (replace invalid chars)
  // Firebase paths can't contain: . # $ [ ]
  const encodedEmail = normalizedEmail.replace(/[.#$[\]]/g, (char) => {
    const map: Record<string, string> = { '.': '_DOT_', '#': '_HASH_', '$': '_DOLLAR_', '[': '_LBRACK_', ']': '_RBRACK_' };
    return map[char] || char;
  });

  if (!otp || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Valid 6-digit OTP is required' });
  }

  // Reject common test OTPs - only accept OTPs from BREVO
  const TEST_OTPS = ['123456', '000000', '111111', '123123'];
  if (TEST_OTPS.includes(otp)) {
    console.warn('verify-otp: Test OTP rejected:', otp);
    return res.status(400).json({
      success: false,
      error: 'Invalid OTP. Please use the OTP sent to your email address.',
    });
  }

  try {
    // Check if Firebase Admin is initialized
    const apps = getApps();
    if (apps.length === 0) {
      console.warn('verify-otp: Firebase Admin not initialized');
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin not initialized. Please check environment variables.',
      });
    }

    const db = getDatabase();
    if (!db) {
      console.warn('verify-otp: Firebase Database not available');
      return res.status(500).json({
        success: false,
        error: 'Firebase Database not available. Please check FIREBASE_DATABASE_URL environment variable.',
      });
    }

      const otpRef = db.ref(`otps/${encodedEmail}`);
    const snapshot = await otpRef.once('value');
    const otpData = snapshot.val();

    if (!otpData) {
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

