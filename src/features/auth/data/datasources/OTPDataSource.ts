import { OTPVerificationResponse } from '../../domain/entities/OTPRequest';

export interface IOTPDataSource {
  sendOTP(email: string): Promise<void>;
  verifyOTP(email: string, otp: string): Promise<OTPVerificationResponse>;
}

export class OTPDataSource implements IOTPDataSource {
  /**
   * Request OTP to be sent via BREVO SMTP (via Vercel serverless function)
   * OTP is generated server-side and stored in Firebase
   */
  async sendOTP(email: string): Promise<void> {
    try {
      console.log('OTPDataSource: Sending OTP to:', email);
      
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('OTPDataSource: Response status:', response.status);
      
      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get('content-type');
      let data: any = {};
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await response.text();
          if (text) {
            data = JSON.parse(text);
            console.log('OTPDataSource: Response data:', data);
          }
        } catch (parseError: any) {
          console.error('OTPDataSource: Failed to parse JSON response:', parseError);
          if (!response.ok) {
            throw new Error(`Server error (${response.status}): Failed to send OTP. Please check your API configuration.`);
          }
        }
      } else {
        // Non-JSON response (likely HTML error page)
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): Failed to send OTP. Please check your API configuration.`);
        }
      }

      if (!response.ok || !data.success) {
        const errorMsg = data.error || `Failed to send OTP (${response.status})`;
        console.error('OTPDataSource: Error response:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('OTPDataSource: OTP sent successfully');
    } catch (error: any) {
      console.error('OTPDataSource: Exception caught:', error);
      // If it's already an Error with a message, use it; otherwise create a new one
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify OTP via server-side verification (Vercel serverless function)
   */
  async verifyOTP(email: string, otp: string): Promise<OTPVerificationResponse> {
    try {
      console.log('OTPDataSource: Verifying OTP for:', email);
      
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      console.log('OTPDataSource: Verification response:', data);

      return {
        success: data.success === true,
        remainingAttempts: data.remainingAttempts,
        error: data.error,
      };
    } catch (error: any) {
      console.error('OTPDataSource: Verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify OTP. Please try again.',
      };
    }
  }
}

