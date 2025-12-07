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
      try {
        // Try to parse as-is first (in case it's already valid JSON string)
        let serviceAccount: any;
        
        // Remove surrounding quotes if present
        if ((serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"')) ||
            (serviceAccountStr.startsWith("'") && serviceAccountStr.endsWith("'"))) {
          serviceAccountStr = serviceAccountStr.slice(1, -1);
        }
        
        // Fix control characters that break JSON parsing
        // Replace actual newlines in the string with escaped newlines
        // But preserve already-escaped sequences
        let fixedJson = '';
        let i = 0;
        while (i < serviceAccountStr.length) {
          if (serviceAccountStr[i] === '\\' && i + 1 < serviceAccountStr.length) {
            // Preserve escape sequences
            fixedJson += serviceAccountStr[i] + serviceAccountStr[i + 1];
            i += 2;
          } else if (serviceAccountStr[i] === '\n' || serviceAccountStr[i] === '\r') {
            // Replace actual newlines with \n
            if (serviceAccountStr[i] === '\r' && i + 1 < serviceAccountStr.length && serviceAccountStr[i + 1] === '\n') {
              fixedJson += '\\n';
              i += 2; // Skip \r\n
            } else {
              fixedJson += '\\n';
              i += 1;
            }
          } else {
            fixedJson += serviceAccountStr[i];
            i += 1;
          }
        }
        serviceAccountStr = fixedJson;
        
        // Now handle escaped sequences properly
        // Replace \\n with actual newlines for the private_key field
        serviceAccountStr = serviceAccountStr.replace(/\\\\n/g, '\x00NEWLINE\x00'); // Preserve double-escaped
        serviceAccountStr = serviceAccountStr.replace(/\\n/g, '\n'); // Convert escaped to actual
        serviceAccountStr = serviceAccountStr.replace(/\x00NEWLINE\x00/g, '\\n'); // Restore double-escaped
        
        // Try parsing as JSON
        try {
          serviceAccount = JSON.parse(serviceAccountStr);
        } catch (parseError) {
          console.error('send-otp: JSON parse failed:', parseError.message);
          // Try alternative: maybe the private_key has unescaped newlines that we need to keep as-is
          // Parse the JSON manually by fixing the private_key field
          try {
            const privateKeyMatch = serviceAccountStr.match(/"private_key"\s*:\s*"([^"]*)"/);
            if (privateKeyMatch) {
              // This is a fallback - shouldn't normally be needed
              console.warn('send-otp: Using fallback JSON parsing');
            }
            throw parseError; // Re-throw to show original error
          } catch (fallbackError) {
            throw parseError;
          }
        }

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
      } catch (parseError: any) {
        console.error('send-otp: Failed to parse FIREBASE_ADMIN_SDK JSON:', parseError.message);
        console.error('send-otp: Error at position:', parseError.message.match(/position (\d+)/)?.[1]);
        console.error('send-otp: First 100 chars of env var:', serviceAccountStr?.substring(0, 100));
        throw parseError;
      }
    }
  } catch (initError: any) {
    console.error('send-otp: Firebase Admin initialization error:', initError);
    console.error('send-otp: Please check FIREBASE_ADMIN_SDK format in .env.local');
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

  // Debug logging
  console.log('send-otp: Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasFast2SMSKey: !!FAST2SMS_API_KEY,
    apiKeyPrefix: FAST2SMS_API_KEY ? FAST2SMS_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    mobileNumber: mobileNumber,
  });

  // Strictly require Fast2SMS API key - no mock/test mode allowed
  if (!FAST2SMS_API_KEY || FAST2SMS_API_KEY.trim() === '') {
    console.error('send-otp: Missing or empty VERCEL_FAST2SMS_API_KEY environment variable');
    return res.status(500).json({ 
      success: false,
      error: 'Fast2SMS API key not configured. Please set VERCEL_FAST2SMS_API_KEY environment variable.' 
    });
  }

  try {
    // Generate secure random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

    // Store OTP in Firebase Realtime Database before sending SMS
    // This ensures OTP is stored even if SMS fails, but we'll clean it up on failure
    let otpStored = false;
    try {
      const db = getDatabase();
      if (!db) {
        console.error('send-otp: Firebase Database not available');
        return res.status(500).json({
          success: false,
          error: 'Database not available. Please check FIREBASE_DATABASE_URL environment variable.',
        });
      }

      const otpRef = db.ref(`otps/${mobileNumber}`);
      await otpRef.set({
        otp: otp,
        createdAt: Date.now(),
        expiresAt: expiryTime,
        attempts: 0,
      });
      otpStored = true;

      // Auto-delete OTP after expiry
      setTimeout(async () => {
        try {
          await otpRef.remove();
        } catch (err) {
          console.error('send-otp: Error deleting expired OTP:', err);
        }
      }, OTP_EXPIRY_MINUTES * 60 * 1000);

      console.log('send-otp: OTP stored in Firebase for mobile:', mobileNumber);
    } catch (firebaseError: any) {
      console.error('send-otp: Firebase storage error:', firebaseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to store OTP. Please try again.',
      });
    }

    // Send OTP via Fast2SMS API
    let smsData: any;
    try {
      // Fast2SMS API format - using 'q' route for OTP messages
      // Fast2SMS API - using query parameters (as per Fast2SMS documentation)
      const apiUrl = new URL('https://www.fast2sms.com/dev/bulkV2');
      apiUrl.searchParams.append('authorization', FAST2SMS_API_KEY);
      apiUrl.searchParams.append('route', 'q'); // 'q' route for OTP/transactional (doesn't require sender_id)
      apiUrl.searchParams.append('message', `Your OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`);
      apiUrl.searchParams.append('numbers', mobileNumber);
      apiUrl.searchParams.append('flash', '0');
      
      const maskedUrl = apiUrl.toString().replace(FAST2SMS_API_KEY, 'HIDDEN');
      console.log('send-otp: Fast2SMS Request Details:', {
        url: maskedUrl,
        route: 'dlt',
        mobileNumber: mobileNumber,
        messageLength: apiUrl.searchParams.get('message')?.length || 0,
        apiKeyLength: FAST2SMS_API_KEY?.length || 0,
        apiKeyPrefix: FAST2SMS_API_KEY?.substring(0, 10) || 'NOT SET',
      });

      const smsResponse = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseText = await smsResponse.text();
      console.log('send-otp: Fast2SMS Raw Response:', {
        status: smsResponse.status,
        statusText: smsResponse.statusText,
        headers: Object.fromEntries(smsResponse.headers.entries()),
        body: responseText,
      });

      if (!smsResponse.ok) {
        console.error('send-otp: Fast2SMS API returned non-OK status:', {
          status: smsResponse.status,
          statusText: smsResponse.statusText,
          body: responseText,
        });
        throw new Error(`Fast2SMS API error: ${smsResponse.status} - ${responseText}`);
      }

      try {
        smsData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('send-otp: Failed to parse Fast2SMS response as JSON:', parseError);
        console.error('send-otp: Response text:', responseText);
        throw new Error(`Invalid JSON response from Fast2SMS: ${responseText}`);
      }

      console.log('send-otp: Fast2SMS Parsed Response:', JSON.stringify(smsData, null, 2));
      
      // Log important response fields
      if (smsData.request_id) {
        console.log('send-otp: Fast2SMS Request ID:', smsData.request_id);
      }
      if (smsData.message) {
        console.log('send-otp: Fast2SMS Message:', smsData.message);
      }
      if (smsData.return !== undefined) {
        console.log('send-otp: Fast2SMS Return Status:', smsData.return);
      }
    } catch (fetchError: any) {
      console.error('send-otp: Fast2SMS API call failed:', fetchError);
      console.error('send-otp: Error details:', {
        message: fetchError.message,
        stack: fetchError.stack,
        name: fetchError.name,
      });
      
      // Clean up Firebase entry if SMS failed
      if (otpStored) {
        try {
          const db = getDatabase();
          if (db) {
            await db.ref(`otps/${mobileNumber}`).remove();
            console.log('send-otp: Cleaned up OTP from Firebase after SMS failure');
          }
        } catch (err) {
          console.error('send-otp: Error cleaning up OTP:', err);
        }
      }

      return res.status(500).json({
        success: false,
        error: `Failed to send OTP via SMS: ${fetchError.message}`,
      });
    }

    // Verify Fast2SMS response
    // Fast2SMS returns { return: true } on success
    if (smsData && smsData.return === true) {
      console.log('send-otp: OTP sent successfully via Fast2SMS');
      console.log('send-otp: OTP details:', {
        mobileNumber: mobileNumber,
        requestId: smsData.request_id || 'N/A',
        otpGenerated: '***', // Don't log actual OTP
      });
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        requestId: smsData.request_id, // Return request ID for tracking
      });
    } else {
      // Fast2SMS returned failure or unexpected response
      console.error('send-otp: Fast2SMS returned failure or unexpected response:', smsData);
      console.error('send-otp: Response analysis:', {
        hasReturn: smsData?.return !== undefined,
        returnValue: smsData?.return,
        hasMessage: !!smsData?.message,
        message: smsData?.message,
        fullResponse: smsData,
      });
      
      // Clean up Firebase entry if SMS failed
      if (otpStored) {
        try {
          const db = getDatabase();
          if (db) {
            await db.ref(`otps/${mobileNumber}`).remove();
            console.log('send-otp: Cleaned up OTP from Firebase after SMS failure');
          }
        } catch (err) {
          console.error('send-otp: Error cleaning up OTP:', err);
        }
      }

      const errorMessage = smsData?.message || smsData?.error || 'Failed to send OTP via SMS. Please check your Fast2SMS account balance and API key.';
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
        details: {
          fast2smsResponse: smsData,
          suggestion: 'Please check: 1) Fast2SMS account has credits, 2) Mobile number format is correct, 3) API key is valid',
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
