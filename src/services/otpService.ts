import { getUserFriendlyError } from '../shared/utils/errorHandler';

/**
 * Request OTP to be sent via BREVO SMTP (via Vercel serverless function)
 * OTP is generated server-side and stored in Firebase
 * @param email - Email address
 * @returns Promise that resolves when OTP is sent
 */
export const sendOTP = async (email: string): Promise<void> => {
  try {
    console.log('sendOTP: Starting OTP request for email:', email);
    
    // Call Vercel serverless function - OTP is generated server-side
    console.log('sendOTP: Calling /api/send-otp endpoint');
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('sendOTP: Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('sendOTP: Error response body:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
      }
      const errorMsg = getUserFriendlyError(errorData, undefined, 'Unable to send verification code. Please try again.');
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    // Check for success response
    if (!response.ok || !data.success) {
      const errorMsg = getUserFriendlyError(data, undefined, 'Unable to send verification code. Please try again.');
      console.error('sendOTP: Error response:', errorMsg);
      throw new Error(errorMsg);
    }

    // Log success
    console.log('sendOTP: OTP sent successfully via BREVO');
  } catch (error: any) {
    console.error('sendOTP: Exception caught:', error);
    console.error('sendOTP: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    
    // Handle network/timeout errors specifically
    if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
      const friendlyError = 'Request timed out. Please check your connection and ensure the API server is running on port 3001.';
      throw new Error(friendlyError);
    }
    
    const friendlyError = getUserFriendlyError(error, undefined, 'Unable to send verification code. Please try again.');
    throw new Error(friendlyError);
  }
};

/**
 * Verify OTP via server-side verification (Vercel serverless function)
 * @param email - Email address
 * @param enteredOTP - OTP entered by user
 * @returns Promise<boolean> - true if OTP is valid
 */
export const verifyOTP = async (
  email: string,
  enteredOTP: string
): Promise<{ success: boolean; remainingAttempts?: number; error?: string }> => {
  try {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp: enteredOTP }),
    });

    const data = await response.json();

    return {
      success: data.success === true,
      remainingAttempts: data.remainingAttempts,
      error: data.error ? getUserFriendlyError(data.error, undefined, 'Verification failed. Please try again.') : undefined,
    };
  } catch (error: any) {
    console.error('OTP verification error:', error);
    const friendlyError = getUserFriendlyError(error, undefined, 'Verification failed. Please try again.');
    return {
      success: false,
      error: friendlyError,
    };
  }
};

