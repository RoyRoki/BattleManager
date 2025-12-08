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
      console.error('verify-otp: Environment variable check:', {
        hasAdminSDK: !!process.env.FIREBASE_ADMIN_SDK,
        adminSDKType: typeof process.env.FIREBASE_ADMIN_SDK,
        adminSDKLength: process.env.FIREBASE_ADMIN_SDK?.length || 0,
      });
      throw error;
    }
    
    console.log('verify-otp: FIREBASE_ADMIN_SDK found:', {
      type: typeof serviceAccountStr,
      length: serviceAccountStr.length,
      firstChars: serviceAccountStr.substring(0, 50) + '...',
    });

    let serviceAccount: any;
    
    // Try multiple parsing strategies with detailed logging
    let parseAttempt = 0;
    const maxParseAttempts = 4;
    let lastParseError: any = null;
    
    while (parseAttempt < maxParseAttempts && !serviceAccount) {
      parseAttempt++;
      try {
        let processedStr = serviceAccountStr;
        
        console.log(`verify-otp: JSON parse attempt ${parseAttempt}/${maxParseAttempts}`);
        
        // Strategy 1: Try parsing as-is (in case Vercel already parsed it as object)
        if (parseAttempt === 1) {
          if (typeof serviceAccountStr === 'object' && serviceAccountStr !== null) {
            console.log('verify-otp: FIREBASE_ADMIN_SDK is already an object, using directly');
            serviceAccount = serviceAccountStr;
            break;
          }
          // Try parsing as-is string
          try {
            serviceAccount = JSON.parse(processedStr);
            console.log('verify-otp: Successfully parsed JSON as-is');
            break;
          } catch (e) {
            console.log('verify-otp: Parse as-is failed, trying next strategy');
            lastParseError = e;
          }
        }
        
        // Strategy 2: Remove surrounding quotes
        if (parseAttempt === 2) {
          if ((processedStr.startsWith('"') && processedStr.endsWith('"')) ||
              (processedStr.startsWith("'") && processedStr.endsWith("'"))) {
            processedStr = processedStr.slice(1, -1);
            console.log('verify-otp: Removed surrounding quotes');
          }
          try {
            serviceAccount = JSON.parse(processedStr);
            console.log('verify-otp: Successfully parsed JSON after removing quotes');
            break;
          } catch (e) {
            console.log('verify-otp: Parse after removing quotes failed');
            lastParseError = e;
          }
        }
        
        // Strategy 3: Handle escaped newlines and control characters
        if (parseAttempt === 3) {
          // Remove surrounding quotes if present
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
          
          try {
            serviceAccount = JSON.parse(processedStr);
            console.log('verify-otp: Successfully parsed JSON after fixing control characters');
            break;
          } catch (e) {
            console.log('verify-otp: Parse after fixing control characters failed');
            lastParseError = e;
          }
        }
        
        // Strategy 4: Simple trim and parse (last resort)
        if (parseAttempt === 4) {
          processedStr = serviceAccountStr.trim();
          // Remove surrounding quotes
          if ((processedStr.startsWith('"') && processedStr.endsWith('"')) ||
              (processedStr.startsWith("'") && processedStr.endsWith("'"))) {
            processedStr = processedStr.slice(1, -1).trim();
          }
          // Replace escaped newlines
          processedStr = processedStr.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
          try {
            serviceAccount = JSON.parse(processedStr);
            console.log('verify-otp: Successfully parsed JSON with simple strategy');
            break;
          } catch (e) {
            console.log('verify-otp: All parse strategies failed');
            lastParseError = e;
          }
        }
      } catch (parseError: any) {
        lastParseError = parseError;
        console.error(`verify-otp: Parse attempt ${parseAttempt} error:`, parseError.message);
      }
    }
    
    if (!serviceAccount) {
      const error = new Error(`Failed to parse FIREBASE_ADMIN_SDK JSON after ${maxParseAttempts} attempts: ${lastParseError?.message || 'Unknown error'}`);
      console.error('verify-otp: All JSON parse attempts failed');
      console.error('verify-otp: Last parse error:', lastParseError);
      console.error('verify-otp: FIREBASE_ADMIN_SDK length:', serviceAccountStr.length);
      console.error('verify-otp: FIREBASE_ADMIN_SDK first 100 chars:', serviceAccountStr.substring(0, 100));
      throw error;
    }

    if (!serviceAccount || !serviceAccount.project_id) {
      const error = new Error('Invalid FIREBASE_ADMIN_SDK - missing project_id');
      console.error('verify-otp: Invalid service account:', error.message);
      throw error;
    }

    // Trim and clean database URL (remove trailing newlines, whitespace, escaped newlines)
    let databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      const error = new Error('FIREBASE_DATABASE_URL environment variable not set');
      console.error('verify-otp: Missing database URL:', error.message);
      throw error;
    }
    
    // Clean the database URL
    databaseURL = databaseURL
      .trim()
      .replace(/\\n/g, '')
      .replace(/\n/g, '')
      .replace(/\\r/g, '')
      .replace(/\r/g, '')
      .replace(/[\r\n]+$/, '')
      .trim();
    
    // Validate URL format
    if (!databaseURL.match(/^https?:\/\/.+/)) {
      const error = new Error(`Invalid FIREBASE_DATABASE_URL format: ${databaseURL.substring(0, 50)}...`);
      console.error('verify-otp: Invalid database URL format:', error.message);
      throw error;
    }
    
    console.log('verify-otp: Database URL cleaned and validated:', databaseURL.substring(0, 60) + '...');

    try {
      console.log('verify-otp: Attempting Firebase Admin initialization with:', {
        projectId: serviceAccount.project_id,
        databaseURL: databaseURL.substring(0, 60) + '...',
        hasPrivateKey: !!serviceAccount.private_key,
        privateKeyLength: serviceAccount.private_key?.length || 0,
      });
      
      app = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: databaseURL,
      });
      console.log('verify-otp: Firebase Admin initialized successfully');
    } catch (initError: any) {
      const error = new Error(`Firebase Admin initialization failed: ${initError.message}`);
      console.error('verify-otp: Initialization error:', error.message);
      console.error('verify-otp: Initialization error details:', {
        message: initError.message,
        code: initError.code,
        name: initError.name,
        stack: initError.stack?.substring(0, 300),
      });
      throw error;
    }
  }

  // Get database instance
  let db: Database;
  try {
    console.log('verify-otp: Getting database instance...');
    db = getDatabase(app);
    if (!db) {
      throw new Error('Database instance is null');
    }
    console.log('verify-otp: Database instance obtained successfully');
  } catch (dbError: any) {
    const error = new Error(`Failed to get database instance: ${dbError.message}`);
    console.error('verify-otp: Database error:', error.message);
    console.error('verify-otp: Database error details:', {
      message: dbError.message,
      code: dbError.code,
      name: dbError.name,
      stack: dbError.stack?.substring(0, 300),
    });
    throw error;
  }

  return { app, db };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Wrap entire handler in try-catch for comprehensive error handling
  try {
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
    } catch (firebaseError: any) {
      // Catch errors from Firebase operations
      console.error('verify-otp: Firebase/OTP verification error:', firebaseError);
      console.error('verify-otp: Error details:', {
        message: firebaseError.message,
        code: firebaseError.code,
        name: firebaseError.name,
        stack: firebaseError.stack?.substring(0, 500),
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to verify OTP. Please try again.',
        errorCode: 'VERIFICATION_ERROR',
        details: process.env.NODE_ENV === 'development' ? {
          message: firebaseError.message,
        } : undefined,
      });
    }
  } catch (error: any) {
    // This catch block handles any errors not caught by inner try-catch blocks
    console.error('verify-otp: Unexpected top-level error:', error);
    console.error('verify-otp: Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.substring(0, 500),
      type: error.constructor?.name || 'Unknown',
    });
    
    // Log environment context for debugging
    console.error('verify-otp: Environment context:', {
      hasAdminSDK: !!process.env.FIREBASE_ADMIN_SDK,
      adminSDKLength: process.env.FIREBASE_ADMIN_SDK?.length || 0,
      hasDatabaseURL: !!process.env.FIREBASE_DATABASE_URL,
      databaseURLLength: process.env.FIREBASE_DATABASE_URL?.length || 0,
      appsInitialized: getApps().length,
      NODE_ENV: process.env.NODE_ENV,
    });
    
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.',
      errorCode: 'UNEXPECTED_ERROR',
    });
  }
}

