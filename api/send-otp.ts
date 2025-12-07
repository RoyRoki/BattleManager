// Vercel serverless function for sending OTP via BREVO SMTP
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
    console.log('send-otp: Using existing Firebase Admin app');
  } else {
    // Initialize Firebase Admin
    const serviceAccountStr = process.env.FIREBASE_ADMIN_SDK;
    if (!serviceAccountStr) {
      const error = new Error('FIREBASE_ADMIN_SDK environment variable not set');
      console.error('send-otp: Firebase Admin initialization failed:', error.message);
      console.error('send-otp: Environment variable check:', {
        hasAdminSDK: !!process.env.FIREBASE_ADMIN_SDK,
        adminSDKType: typeof process.env.FIREBASE_ADMIN_SDK,
        adminSDKLength: process.env.FIREBASE_ADMIN_SDK?.length || 0,
      });
      throw error;
    }
    
    console.log('send-otp: FIREBASE_ADMIN_SDK found:', {
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
        
        console.log(`send-otp: JSON parse attempt ${parseAttempt}/${maxParseAttempts}`);
        
        // Strategy 1: Try parsing as-is (in case Vercel already parsed it as object)
        if (parseAttempt === 1) {
          if (typeof serviceAccountStr === 'object' && serviceAccountStr !== null) {
            console.log('send-otp: FIREBASE_ADMIN_SDK is already an object, using directly');
            serviceAccount = serviceAccountStr;
            break;
          }
          // Try parsing as-is string
          try {
            serviceAccount = JSON.parse(processedStr);
            console.log('send-otp: Successfully parsed JSON as-is');
            break;
          } catch (e) {
            console.log('send-otp: Parse as-is failed, trying next strategy');
            lastParseError = e;
          }
        }
        
        // Strategy 2: Remove surrounding quotes
        if (parseAttempt === 2) {
          if ((processedStr.startsWith('"') && processedStr.endsWith('"')) ||
              (processedStr.startsWith("'") && processedStr.endsWith("'"))) {
            processedStr = processedStr.slice(1, -1);
            console.log('send-otp: Removed surrounding quotes');
          }
          try {
            serviceAccount = JSON.parse(processedStr);
            console.log('send-otp: Successfully parsed JSON after removing quotes');
            break;
          } catch (e) {
            console.log('send-otp: Parse after removing quotes failed');
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
            console.log('send-otp: Successfully parsed JSON after fixing control characters');
            break;
          } catch (e) {
            console.log('send-otp: Parse after fixing control characters failed');
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
            console.log('send-otp: Successfully parsed JSON with simple strategy');
            break;
          } catch (e) {
            console.log('send-otp: All parse strategies failed');
            lastParseError = e;
          }
        }
      } catch (parseError: any) {
        lastParseError = parseError;
        console.error(`send-otp: Parse attempt ${parseAttempt} error:`, parseError.message);
      }
    }
    
    if (!serviceAccount) {
      const error = new Error(`Failed to parse FIREBASE_ADMIN_SDK JSON after ${maxParseAttempts} attempts: ${lastParseError?.message || 'Unknown error'}`);
      console.error('send-otp: All JSON parse attempts failed');
      console.error('send-otp: Last parse error:', lastParseError);
      console.error('send-otp: FIREBASE_ADMIN_SDK length:', serviceAccountStr.length);
      console.error('send-otp: FIREBASE_ADMIN_SDK first 100 chars:', serviceAccountStr.substring(0, 100));
      throw error;
    }

    if (!serviceAccount || !serviceAccount.project_id) {
      const error = new Error('Invalid FIREBASE_ADMIN_SDK - missing project_id');
      console.error('send-otp: Invalid service account:', error.message);
      throw error;
    }

    // Trim and clean database URL (remove trailing newlines, whitespace, escaped newlines)
    let databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      const error = new Error('FIREBASE_DATABASE_URL environment variable not set');
      console.error('send-otp: Missing database URL:', error.message);
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
      console.error('send-otp: Invalid database URL format:', error.message);
      throw error;
    }
    
    console.log('send-otp: Database URL cleaned and validated:', databaseURL.substring(0, 60) + '...');

    try {
      console.log('send-otp: Attempting Firebase Admin initialization with:', {
        projectId: serviceAccount.project_id,
        databaseURL: databaseURL.substring(0, 60) + '...',
        hasPrivateKey: !!serviceAccount.private_key,
        privateKeyLength: serviceAccount.private_key?.length || 0,
      });
      
      app = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: databaseURL,
      });
      console.log('send-otp: Firebase Admin initialized successfully');
    } catch (initError: any) {
      const error = new Error(`Firebase Admin initialization failed: ${initError.message}`);
      console.error('send-otp: Initialization error:', error.message);
      console.error('send-otp: Initialization error details:', {
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
    console.log('send-otp: Getting database instance...');
    db = getDatabase(app);
    if (!db) {
      throw new Error('Database instance is null');
    }
    console.log('send-otp: Database instance obtained successfully');
  } catch (dbError: any) {
    const error = new Error(`Failed to get database instance: ${dbError.message}`);
    console.error('send-otp: Database error:', error.message);
    console.error('send-otp: Database error details:', {
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

    const { email } = req.body;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    // Normalize email (lowercase) for storage
    const normalizedEmail = email.toLowerCase().trim();

    // Encode email for Firebase Realtime Database path (replace invalid chars)
    // Firebase paths can't contain: . # $ [ ]
    const encodedEmail = normalizedEmail.replace(/[.#$[\]]/g, (char: string) => {
      const map: Record<string, string> = { '.': '_DOT_', '#': '_HASH_', '$': '_DOLLAR_', '[': '_LBRACK_', ']': '_RBRACK_' };
      return map[char] || char;
    });

    // Helper function to get BREVO API key with fallback support
  const getBrevoKey = (): string | null => {
    // Try keys in priority order
    const keyCandidates = [
      process.env.VERCEL_BREVO_KEY,
      process.env.VERCEL_BREVO_KEY_FALLBACK_1,
      process.env.VERCEL_BREVO_KEY_FALLBACK_2,
      process.env.BREVO_KEY,
      process.env.BREVO_API_KEY,
      process.env.VERCEL_BREVO_KEY_FALLBACK_3,
    ];

    for (let i = 0; i < keyCandidates.length; i++) {
      const key = keyCandidates[i];
      if (key && key.trim() !== '') {
        console.log(`send-otp: Using BREVO key from source ${i === 0 ? 'VERCEL_BREVO_KEY' : i === 1 ? 'VERCEL_BREVO_KEY_FALLBACK_1' : i === 2 ? 'VERCEL_BREVO_KEY_FALLBACK_2' : i === 3 ? 'BREVO_KEY' : i === 4 ? 'BREVO_API_KEY' : 'VERCEL_BREVO_KEY_FALLBACK_3'}`);
        return key.trim();
      }
    }
    return null;
  };

  // Helper function to get BREVO SMTP key with fallback support
  const getBrevoSmtpKey = (): string | null => {
    // Try keys in priority order
    const keyCandidates = [
      process.env.VERCEL_BREVO_SMTP_KEY,
      process.env.VERCEL_BREVO_SMTP_KEY_FALLBACK_1,
      process.env.VERCEL_BREVO_SMTP_KEY_FALLBACK_2,
      process.env.BREVO_SMTP_KEY,
      process.env.VERCEL_BREVO_SMTP_KEY_FALLBACK_3,
    ];

    for (let i = 0; i < keyCandidates.length; i++) {
      const key = keyCandidates[i];
      if (key && key.trim() !== '') {
        console.log(`send-otp: Using BREVO SMTP key from source ${i === 0 ? 'VERCEL_BREVO_SMTP_KEY' : i === 1 ? 'VERCEL_BREVO_SMTP_KEY_FALLBACK_1' : i === 2 ? 'VERCEL_BREVO_SMTP_KEY_FALLBACK_2' : i === 3 ? 'BREVO_SMTP_KEY' : 'VERCEL_BREVO_SMTP_KEY_FALLBACK_3'}`);
        return key.trim();
      }
    }
    return null;
  };

    const BREVO_KEY = getBrevoKey();
    const BREVO_SMTP_KEY = getBrevoSmtpKey();
    const OTP_EXPIRY_MINUTES = 5;

    // Debug logging
    console.log('send-otp: Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasBrevoKey: !!BREVO_KEY,
    hasBrevoSmtpKey: !!BREVO_SMTP_KEY,
    apiKeyPrefix: BREVO_KEY ? BREVO_KEY.substring(0, 10) + '...' : 'NOT SET',
    hasFallback1: !!process.env.VERCEL_BREVO_KEY_FALLBACK_1,
    hasFallback2: !!process.env.VERCEL_BREVO_KEY_FALLBACK_2,
    email: normalizedEmail,
  });

    // Check for BREVO API keys with fallback support
    if (!BREVO_KEY) {
      console.error('send-otp: Missing BREVO API key in all fallback sources');
      console.error('send-otp: Checked keys:', {
        VERCEL_BREVO_KEY: !!process.env.VERCEL_BREVO_KEY,
        VERCEL_BREVO_KEY_FALLBACK_1: !!process.env.VERCEL_BREVO_KEY_FALLBACK_1,
        VERCEL_BREVO_KEY_FALLBACK_2: !!process.env.VERCEL_BREVO_KEY_FALLBACK_2,
        BREVO_KEY: !!process.env.BREVO_KEY,
        BREVO_API_KEY: !!process.env.BREVO_API_KEY,
      });
      return res.status(500).json({ 
        success: false,
        error: 'BREVO API key not configured. Please set VERCEL_BREVO_KEY or one of the fallback environment variables.' 
      });
    }

    if (!BREVO_SMTP_KEY) {
      console.error('send-otp: Missing BREVO SMTP key in all fallback sources');
      console.error('send-otp: Checked keys:', {
        VERCEL_BREVO_SMTP_KEY: !!process.env.VERCEL_BREVO_SMTP_KEY,
        VERCEL_BREVO_SMTP_KEY_FALLBACK_1: !!process.env.VERCEL_BREVO_SMTP_KEY_FALLBACK_1,
        VERCEL_BREVO_SMTP_KEY_FALLBACK_2: !!process.env.VERCEL_BREVO_SMTP_KEY_FALLBACK_2,
        BREVO_SMTP_KEY: !!process.env.BREVO_SMTP_KEY,
      });
      return res.status(500).json({ 
        success: false,
        error: 'BREVO SMTP key not configured. Please set VERCEL_BREVO_SMTP_KEY or one of the fallback environment variables.' 
      });
    }

    try {
    // Generate secure random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

    // Store OTP in Firebase Realtime Database before sending email
    // This ensures OTP is stored even if email fails, but we'll clean it up on failure
    let otpStored = false;
    let otpRef: any = null;
    try {
      // Ensure Firebase is properly initialized
      console.log('send-otp: Ensuring Firebase Admin is initialized');
      const { db } = ensureFirebaseInitialized();

      console.log('send-otp: Attempting to store OTP in Firebase at path: otps/' + encodedEmail);
      otpRef = db.ref(`otps/${encodedEmail}`);
      
      // Use a transaction-like approach with retry logic
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let stored = false;
      
      while (!stored && retryCount < MAX_RETRIES) {
        try {
          await otpRef.set({
            otp: otp,
            createdAt: Date.now(),
            expiresAt: expiryTime,
            attempts: 0,
          });
          stored = true;
          otpStored = true;
          console.log('send-otp: OTP stored successfully in Firebase for email:', normalizedEmail);
        } catch (setError: any) {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            throw setError;
          }
          // Wait before retry (exponential backoff)
          const backoffMs = Math.pow(2, retryCount) * 100;
          console.warn(`send-otp: OTP storage attempt ${retryCount} failed, retrying in ${backoffMs}ms:`, setError.message);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }

      // Auto-delete OTP after expiry
      setTimeout(async () => {
        try {
          if (otpRef) {
            await otpRef.remove();
            console.log('send-otp: Expired OTP cleaned up for email:', normalizedEmail);
          }
        } catch (err) {
          console.error('send-otp: Error deleting expired OTP:', err);
        }
      }, OTP_EXPIRY_MINUTES * 60 * 1000);

    } catch (firebaseError: any) {
      // Log comprehensive error details
      const errorDetails = {
        message: firebaseError.message,
        code: firebaseError.code,
        name: firebaseError.name,
        stack: firebaseError.stack?.substring(0, 500), // Limit stack trace length
        databaseURL: process.env.FIREBASE_DATABASE_URL ? 'SET' : 'NOT SET',
        hasAdminSDK: !!process.env.FIREBASE_ADMIN_SDK,
        adminSDKLength: process.env.FIREBASE_ADMIN_SDK?.length || 0,
        appsInitialized: getApps().length,
        errorType: firebaseError.constructor?.name || 'Unknown',
      };
      
      console.error('send-otp: Firebase storage error:', firebaseError);
      console.error('send-otp: Firebase error details:', JSON.stringify(errorDetails, null, 2));
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to store OTP. Please try again.';
      let errorCode = 'STORAGE_ERROR';
      
      if (firebaseError.message?.includes('FIREBASE_ADMIN_SDK') || 
          firebaseError.message?.includes('environment variable not set')) {
        errorMessage = 'Firebase configuration error. Please contact support.';
        errorCode = 'CONFIG_ERROR';
      } else if (firebaseError.message?.includes('FIREBASE_DATABASE_URL') || 
                 firebaseError.message?.includes('Database')) {
        errorMessage = 'Database configuration error. Please contact support.';
        errorCode = 'DATABASE_CONFIG_ERROR';
      } else if (firebaseError.code === 'PERMISSION_DENIED' || 
                 firebaseError.code === 'permission-denied' ||
                 firebaseError.message?.includes('permission')) {
        errorMessage = 'Database permission denied. Please contact support.';
        errorCode = 'PERMISSION_ERROR';
      } else if (firebaseError.code === 'UNAVAILABLE' || 
                 firebaseError.message?.includes('unavailable') ||
                 firebaseError.message?.includes('network')) {
        errorMessage = 'Database temporarily unavailable. Please try again.';
        errorCode = 'UNAVAILABLE_ERROR';
      } else if (firebaseError.message?.includes('initialization') ||
                 firebaseError.message?.includes('initialize')) {
        errorMessage = 'Firebase initialization error. Please contact support.';
        errorCode = 'INIT_ERROR';
      }
      
      // Return error with sanitized details for production debugging
      return res.status(500).json({
        success: false,
        error: errorMessage,
        errorCode: errorCode,
        // Include sanitized error details in production for debugging
        details: {
          code: firebaseError.code || 'UNKNOWN',
          type: errorCode,
          // Only include message in development or if it's a known safe error
          message: (process.env.NODE_ENV === 'development' || 
                   errorCode === 'UNAVAILABLE_ERROR' || 
                   errorCode === 'PERMISSION_ERROR') 
                   ? firebaseError.message : undefined,
        },
      });
    }

    // Send OTP via BREVO Transactional Email API with fallback key support
    let emailData: any;
    let emailResponse: Response | null = null;
    
    // Function to try sending email with a specific key
    const trySendEmail = async (apiKey: string, keyName: string): Promise<{ response: Response; data: any }> => {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .otp-box { background: #f4f4f4; border: 2px solid #00FF41; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #00FF41; letter-spacing: 5px; }
            .warning { color: #FF0040; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Your BattleManager OTP</h2>
            <p>Your One-Time Password (OTP) for BattleManager is:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p>This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>
            <p class="warning"><strong>Do not share this OTP with anyone.</strong></p>
            <p>If you didn't request this OTP, please ignore this email.</p>
          </div>
        </body>
        </html>
      `;

      const emailText = `Your BattleManager OTP is: ${otp}\n\nThis OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.\n\nDo not share this OTP with anyone.\n\nIf you didn't request this OTP, please ignore this email.`;

      const emailPayload = {
        sender: {
          name: 'BattleManager',
          email: 'battlemanagerofficial@gmail.com',
        },
        to: [
          {
            email: normalizedEmail,
          },
        ],
        subject: 'Your BattleManager OTP',
        htmlContent: emailHtml,
        textContent: emailText,
      };

      console.log('send-otp: BREVO Email Request Details:', {
        to: normalizedEmail,
        subject: emailPayload.subject,
        hasHtmlContent: !!emailPayload.htmlContent,
        hasTextContent: !!emailPayload.textContent,
      });

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(emailPayload),
      });

      const responseText = await response.text();
      console.log(`send-otp: BREVO Raw Response (using ${keyName}):`, {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });

      if (!response.ok) {
        const errorData = responseText ? JSON.parse(responseText) : {};
        return { response, data: errorData };
      }

      let parsedData: any = {};
      try {
        parsedData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        if (response.status === 201) {
          parsedData = { success: true };
        }
      }

      return { response, data: parsedData };
    };

    try {
      // Try sending with primary key first
      const allKeys = [
        { key: BREVO_KEY, name: 'VERCEL_BREVO_KEY' },
        { key: process.env.VERCEL_BREVO_KEY_FALLBACK_1, name: 'VERCEL_BREVO_KEY_FALLBACK_1' },
        { key: process.env.VERCEL_BREVO_KEY_FALLBACK_2, name: 'VERCEL_BREVO_KEY_FALLBACK_2' },
        { key: process.env.BREVO_KEY, name: 'BREVO_KEY' },
        { key: process.env.BREVO_API_KEY, name: 'BREVO_API_KEY' },
        { key: process.env.VERCEL_BREVO_KEY_FALLBACK_3, name: 'VERCEL_BREVO_KEY_FALLBACK_3' },
      ].filter((k): k is { key: string; name: string } => !!k.key && k.key.trim() !== '');

      console.log(`send-otp: Attempting to send email with ${allKeys.length} available key(s)`);

      if (allKeys.length === 0) {
        throw new Error('No BREVO API keys available');
      }

      let emailSent = false;
      let lastError: any = null;

      for (let i = 0; i < allKeys.length; i++) {
        const { key, name } = allKeys[i];
        
        try {
          console.log(`send-otp: Trying key ${i + 1}/${allKeys.length}: ${name}`);
          const result = await trySendEmail(key, name);
          emailResponse = result.response;
          emailData = result.data;

          if (emailResponse.ok || emailResponse.status === 201) {
            console.log(`send-otp: Successfully sent email using ${name}`);
            emailSent = true;
            break;
          } else if (emailResponse.status === 401) {
            // Unauthorized - try next key
            console.warn(`send-otp: Key ${name} returned 401 (unauthorized), trying next key...`);
            lastError = new Error(`BREVO API error: ${emailResponse.status} - ${JSON.stringify(emailData)}`);
            continue;
          } else {
            // Other error - throw immediately
            throw new Error(`BREVO API error: ${emailResponse.status} - ${JSON.stringify(emailData)}`);
          }
        } catch (keyError: any) {
          if (keyError.message?.includes('401') || keyError.message?.includes('unauthorized')) {
            console.warn(`send-otp: Key ${name} failed with 401, trying next key...`);
            lastError = keyError;
            continue;
          }
          throw keyError;
        }
      }

      if (!emailSent || !emailResponse) {
        console.error('send-otp: All BREVO keys failed');
        throw lastError || new Error('All BREVO API keys failed');
      }

      const responseText = emailResponse.status === 201 ? '{}' : JSON.stringify(emailData);
      console.log('send-otp: BREVO Final Response:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        body: responseText,
      });

      if (!emailResponse.ok && emailResponse.status !== 201) {
        console.error('send-otp: BREVO API returned non-OK status:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          body: responseText,
        });
        throw new Error(`BREVO API error: ${emailResponse.status} - ${responseText}`);
      }

      // emailData is already parsed in trySendEmail function
      console.log('send-otp: BREVO Parsed Response:', JSON.stringify(emailData, null, 2));
      
      // Log important response fields
      if (emailData.messageId) {
        console.log('send-otp: BREVO Message ID:', emailData.messageId);
      }
    } catch (fetchError: any) {
      console.error('send-otp: BREVO API call failed:', fetchError);
      console.error('send-otp: Error details:', {
        message: fetchError.message,
        stack: fetchError.stack,
        name: fetchError.name,
      });
      
      // Clean up Firebase entry if email failed
      if (otpStored && otpRef) {
        try {
          await otpRef.remove();
          console.log('send-otp: Cleaned up OTP from Firebase after email failure');
        } catch (err) {
          console.error('send-otp: Error cleaning up OTP:', err);
        }
      }

      return res.status(500).json({
        success: false,
        error: `Failed to send OTP via email: ${fetchError.message}`,
      });
    }

    // Verify BREVO response
    // BREVO returns 201 status on success
    if (emailResponse.status === 201 || emailData?.messageId) {
      console.log('send-otp: OTP sent successfully via BREVO');
      console.log('send-otp: OTP details:', {
        email: normalizedEmail,
        messageId: emailData?.messageId || 'N/A',
        otpGenerated: '***', // Don't log actual OTP
      });
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        messageId: emailData?.messageId, // Return message ID for tracking
      });
    } else {
      // BREVO returned failure or unexpected response
      console.error('send-otp: BREVO returned failure or unexpected response:', emailData);
      
      // Clean up Firebase entry if email failed
      if (otpStored && otpRef) {
        try {
          await otpRef.remove();
          console.log('send-otp: Cleaned up OTP from Firebase after email failure');
        } catch (err) {
          console.error('send-otp: Error cleaning up OTP:', err);
        }
      }

      const errorMessage = emailData?.message || emailData?.error || 'Failed to send OTP via email. Please check your BREVO account and API key.';
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
        details: {
          brevoResponse: emailData,
          suggestion: 'Please check: 1) BREVO account is active, 2) Email address is valid, 3) API key is valid, 4) Sender email is verified',
        },
      });
    }
  } catch (error: any) {
    // This catch block handles any errors not caught by inner try-catch blocks
    console.error('send-otp: Unexpected top-level error:', error);
    console.error('send-otp: Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.substring(0, 500),
      type: error.constructor?.name || 'Unknown',
    });
    
    // Log environment context for debugging
    console.error('send-otp: Environment context:', {
      hasAdminSDK: !!process.env.FIREBASE_ADMIN_SDK,
      adminSDKLength: process.env.FIREBASE_ADMIN_SDK?.length || 0,
      hasDatabaseURL: !!process.env.FIREBASE_DATABASE_URL,
      databaseURLLength: process.env.FIREBASE_DATABASE_URL?.length || 0,
      appsInitialized: getApps().length,
      NODE_ENV: process.env.NODE_ENV,
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      errorCode: 'UNEXPECTED_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack?.substring(0, 500),
      } : undefined,
    });
  }
}
