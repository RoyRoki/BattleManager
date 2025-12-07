/**
 * Request OTP to be sent via Fast2SMS (via Vercel serverless function)
 * OTP is generated server-side and stored in Firebase
 * @param mobileNumber - 10-digit mobile number
 * @returns Promise that resolves when OTP is sent
 */
export const sendOTP = async (mobileNumber: string): Promise<void> => {
  try {
    console.log('sendOTP: Starting OTP request for mobile:', mobileNumber);
    
    // Call Vercel serverless function - OTP is generated server-side
    console.log('sendOTP: Calling /api/send-otp endpoint');
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber }),
    });

    console.log('sendOTP: Response status:', response.status, response.statusText);
    
    const data = await response.json();
    
    // Check for success response
    if (!response.ok || !data.success) {
      const errorMsg = data.error || 'Failed to send OTP';
      console.error('sendOTP: Error response:', errorMsg);
      throw new Error(errorMsg);
    }

    // Log success
    console.log('sendOTP: OTP sent successfully via Fast2SMS');
  } catch (error: any) {
    console.error('sendOTP: Exception caught:', error);
    console.error('sendOTP: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw new Error(error.message || 'Failed to send OTP. Please try again.');
  }
};

/**
 * Verify OTP via server-side verification (Vercel serverless function)
 * @param mobileNumber - 10-digit mobile number
 * @param enteredOTP - OTP entered by user
 * @returns Promise<boolean> - true if OTP is valid
 */
export const verifyOTP = async (
  mobileNumber: string,
  enteredOTP: string
): Promise<{ success: boolean; remainingAttempts?: number; error?: string }> => {
  try {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber, otp: enteredOTP }),
    });

    const data = await response.json();

    return {
      success: data.success === true,
      remainingAttempts: data.remainingAttempts,
      error: data.error,
    };
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify OTP. Please try again.',
    };
  }
};

