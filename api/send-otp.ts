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
      console.error('send-otp: JSON parse error:', error.message);
      throw error;
    }

    if (!serviceAccount || !serviceAccount.project_id) {
      const error = new Error('Invalid FIREBASE_ADMIN_SDK - missing project_id');
      console.error('send-otp: Invalid service account:', error.message);
      throw error;
    }

    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      const error = new Error('FIREBASE_DATABASE_URL environment variable not set');
      console.error('send-otp: Missing database URL:', error.message);
      throw error;
    }

    try {
      app = initializeApp({
        credential: cert(serviceAccount as any),
        databaseURL: databaseURL,
      });
      console.log('send-otp: Firebase Admin initialized successfully');
    } catch (initError: any) {
      const error = new Error(`Firebase Admin initialization failed: ${initError.message}`);
      console.error('send-otp: Initialization error:', error.message);
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
    console.error('send-otp: Database error:', error.message);
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

  const BREVO_KEY = process.env.VERCEL_BREVO_KEY;
  const BREVO_SMTP_KEY = process.env.VERCEL_BREVO_SMTP_KEY;
  const OTP_EXPIRY_MINUTES = 5;

  // Debug logging
  console.log('send-otp: Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasBrevoKey: !!BREVO_KEY,
    hasBrevoSmtpKey: !!BREVO_SMTP_KEY,
    apiKeyPrefix: BREVO_KEY ? BREVO_KEY.substring(0, 10) + '...' : 'NOT SET',
    email: normalizedEmail,
  });

  // Strictly require BREVO API keys - no mock/test mode allowed
  if (!BREVO_KEY || BREVO_KEY.trim() === '') {
    console.error('send-otp: Missing or empty VERCEL_BREVO_KEY environment variable');
    return res.status(500).json({ 
      success: false,
      error: 'BREVO API key not configured. Please set VERCEL_BREVO_KEY environment variable.' 
    });
  }

  if (!BREVO_SMTP_KEY || BREVO_SMTP_KEY.trim() === '') {
    console.error('send-otp: Missing or empty VERCEL_BREVO_SMTP_KEY environment variable');
    return res.status(500).json({ 
      success: false,
      error: 'BREVO SMTP key not configured. Please set VERCEL_BREVO_SMTP_KEY environment variable.' 
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

    // Send OTP via BREVO Transactional Email API
    let emailData: any;
    let emailResponse: Response;
    try {
      // BREVO Transactional Email API endpoint
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

      emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_KEY,
        },
        body: JSON.stringify(emailPayload),
      });

      const responseText = await emailResponse.text();
      console.log('send-otp: BREVO Raw Response:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        headers: Object.fromEntries(emailResponse.headers.entries()),
        body: responseText,
      });

      if (!emailResponse.ok) {
        console.error('send-otp: BREVO API returned non-OK status:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          body: responseText,
        });
        throw new Error(`BREVO API error: ${emailResponse.status} - ${responseText}`);
      }

      try {
        emailData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('send-otp: Failed to parse BREVO response as JSON:', errorMessage);
        console.error('send-otp: Response text:', responseText);
        // BREVO may return empty response on success, which is fine
        if (emailResponse.status === 201) {
          emailData = { success: true };
        } else {
          throw new Error(`Invalid JSON response from BREVO: ${responseText}`);
        }
      }

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
