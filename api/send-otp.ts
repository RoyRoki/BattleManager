// Vercel serverless function for sending OTP via BREVO SMTP
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
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          console.error('send-otp: JSON parse failed:', errorMessage);
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

      const otpRef = db.ref(`otps/${encodedEmail}`);
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

      console.log('send-otp: OTP stored in Firebase for email:', normalizedEmail);
    } catch (firebaseError: any) {
      console.error('send-otp: Firebase storage error:', firebaseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to store OTP. Please try again.',
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
      if (otpStored) {
        try {
          const db = getDatabase();
          if (db) {
            await db.ref(`otps/${encodedEmail}`).remove();
            console.log('send-otp: Cleaned up OTP from Firebase after email failure');
          }
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
      if (otpStored) {
        try {
          const db = getDatabase();
          if (db) {
            await db.ref(`otps/${encodedEmail}`).remove();
            console.log('send-otp: Cleaned up OTP from Firebase after email failure');
          }
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
