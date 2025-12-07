// Vercel serverless function for verifying OTP
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';

// Helper function to ensure Firebase Admin is initialized
function ensureFirebaseInitialized(): { app: App; db: Database } {
  let app: App;
  
  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    console.log('verify-otp: Using existing Firebase Admin app');
  } else {
    // Initialize Firebase Admin
    const serviceAccountStr = process.env.FIREBASE_ADMIN_SDK;
    if (!serviceAccountStr) {
      const error = new Error('FIREBASE_ADMIN_SDK environment variable not set');
      console.error('verify-otp: Firebase Admin initialization failed:', error.message);
      throw error;
    }

    let serviceAccount: any;
    
    try {
      // Remove surrounding quotes if present
      let processedStr = serviceAccountStr;
      if ((processedStr.startsWith('"') && processedStr.endsWith('"')) ||
          (processedStr.startsWith("'") && processedStr.endsWith("'"))) {
        processedStr = processedStr.slice(1, -1);
      }
      
      // Fix control characters that break JSON parsing
      let fixedJson = '';
      let i = 0;
      while (i < processedStr.length) {
        if (processedStr[i] === '\\' && i + 1 < processedStr.length) {
          fixedJson += processedStr[i] + processedStr[i + 1];
          i += 2;
        } else if (processedStr[i] === '\n' || processedStr[i] === '\r') {
          if (processedStr[i] === '\r' && i + 1 < processedStr.length && processedStr[i + 1] === '\n') {
            fixedJson += '\\n';
            i += 2;
          } else {
            fixedJson += '\\n';
            i += 1;
          }
        } else {
          fixedJson += processedStr[i];
          i += 1;
        }
      }
      processedStr = fixedJson;
      
      // Handle escaped sequences properly
      processedStr = processedStr.replace(/\\\\n/g, '\x00NEWLINE\x00');
      processedStr = processedStr.replace(/\\n/g, '\n');
      processedStr = processedStr.replace(/\x00NEWLINE\x00/g, '\\n');
      
      // Parse JSON
      serviceAccount = JSON.parse(processedStr);
    } catch (parseError: any) {
      const error = new Error(`Failed to parse FIREBASE_ADMIN_SDK JSON: ${parseError.message}`);
      console.error('verify-otp: JSON parse error:', error.message);
      throw error;
    }

    if (!serviceAccount || !serviceAccount.project_id) {
      const error = new Error('Invalid FIREBASE_ADMIN_SDK - missing project_id');
      console.error('verify-otp: Invalid service account:', error.message);
      throw error;
    }

    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      const error = new Error('FIREBASE_DATABASE_URL environment variable not set');
      console.error('verify-otp: Missing database URL:', error.message);
      throw error;
    }

    try {
      app = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: databaseURL,
      });
      console.log('verify-otp: Firebase Admin initialized successfully');
    } catch (initError: any) {
      const error = new Error(`Firebase Admin initialization failed: ${initError.message}`);
      console.error('verify-otp: Initialization error:', error.message);
      throw error;
    }
  }

  // Get database instance
  let db: Database;
  try {
    db = getDatabase(app);
    if (!db) {
      throw new Error('Database instance is null');
    }
  } catch (dbError: any) {
    const error = new Error(`Failed to get database instance: ${dbError.message}`);
    console.error('verify-otp: Database error:', error.message);
    throw error;
  }

  return { app, db };
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
  const encodedEmail = normalizedEmail.replace(/[.#$[\]]/g, (char: string) => {
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
    // Ensure Firebase is properly initialized
    console.log('verify-otp: Ensuring Firebase Admin is initialized');
    const { db } = ensureFirebaseInitialized();

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

