import { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { sendOTP, verifyOTP } from '../services/otpService';
import { mobileSchema, otpSchema } from '../utils/validations';
import toast from 'react-hot-toast';

interface SignupData {
  name: string;
  ff_id: string;
  mobileNumber: string;
}

interface OTPState {
  attempts: number;
  isVerified: boolean;
  isLoading: boolean;
  isLoadingVerification: boolean;
}

export const useOTP = () => {
  const [otpState, setOtpState] = useState<OTPState>({
    attempts: 0,
    isVerified: false,
    isLoading: false,
    isLoadingVerification: false,
  });

  const sendOTPCode = async (mobileNumber: string): Promise<boolean> => {
    try {
      console.log('sendOTPCode: Starting, mobile:', mobileNumber);
      
      // Validate mobile number
      console.log('sendOTPCode: Validating mobile number');
      mobileSchema.parse(mobileNumber);
      console.log('sendOTPCode: Validation passed');

      console.log('sendOTPCode: Setting loading state');
      setOtpState((prev) => ({ ...prev, isLoading: true, isVerified: false, attempts: 0 }));

      // Call serverless function - OTP is generated and stored server-side
      console.log('sendOTPCode: Calling sendOTP service');
      await sendOTP(mobileNumber);
      console.log('sendOTPCode: sendOTP completed successfully');

      console.log('sendOTPCode: Clearing loading state');
      setOtpState((prev) => ({
        ...prev,
        isLoading: false,
        isVerified: false,
        attempts: 0,
      }));

      console.log('sendOTPCode: Showing success toast');
      toast.success('OTP sent successfully!');
      console.log('sendOTPCode: Returning true');
      return true;
    } catch (error: any) {
      console.error('sendOTPCode: Error caught:', error);
      console.error('sendOTPCode: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      toast.error(error.message || 'Failed to send OTP');
      setOtpState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const verifyOTPCode = async (
    enteredOTP: string,
    mobileNumber: string,
    signupData?: SignupData
  ): Promise<boolean> => {
    try {
      otpSchema.parse(enteredOTP);

      setOtpState((prev) => ({ ...prev, isLoadingVerification: true }));

      // Verify OTP via serverless function (server-side verification)
      const result = await verifyOTP(mobileNumber, enteredOTP);

      setOtpState((prev) => ({ ...prev, isLoadingVerification: false }));

      if (result.success) {
        // OTP is verified - create/update user
        const userRef = doc(firestore, 'users', mobileNumber);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // New user signup - require signup data
          if (!signupData || !signupData.name || !signupData.ff_id) {
            toast.error('Please provide name and Free Fire ID for signup');
            return false;
          }

          await setDoc(userRef, {
            mobile_no: mobileNumber,
            name: signupData.name,
            ff_id: signupData.ff_id,
            points: 0,
            enrolled_tournaments: [],
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true,
          });

          toast.success('Account created successfully!');
        } else {
          // Existing user login
          toast.success('Login successful!');
        }

        setOtpState((prev) => ({
          ...prev,
          isVerified: true,
          attempts: 0,
        }));

        return true;
      } else {
        // OTP verification failed
        setOtpState((prev) => ({
          ...prev,
          attempts: prev.attempts + 1,
        }));

        if (result.remainingAttempts !== undefined && result.remainingAttempts > 0) {
          toast.error(
            result.error || `Invalid OTP. ${result.remainingAttempts} attempts remaining.`
          );
        } else {
          toast.error(result.error || 'Maximum attempts exceeded. Please request a new OTP.');
          // Reset OTP state to require new OTP
          setOtpState((prev) => ({
            ...prev,
            attempts: 0,
            isVerified: false,
          }));
        }

        return false;
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Failed to verify OTP');
      return false;
    }
  };

  const checkUserExists = async (mobileNumber: string): Promise<boolean> => {
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 60000; // 60 seconds (1 minute) timeout per attempt for production
    let lastError: Error | null = null;
    
    console.log('checkUserExists: Starting check for mobile:', mobileNumber);
    
    // Check if Firestore is initialized
    if (!firestore) {
      console.error('checkUserExists: Firestore not initialized');
      throw new Error('Firestore is not initialized. Please check your connection.');
    }
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      try {
        console.log(`checkUserExists: Attempt ${attempt + 1}/${MAX_RETRIES}`);
        
        const userRef = doc(firestore, 'users', mobileNumber);
        
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`User check timeout after ${TIMEOUT_MS / 1000} seconds`));
          }, TIMEOUT_MS);
        });
        
        // Create Firestore query promise
        const docPromise = getDoc(userRef)
          .then((userDoc) => {
            // Clear timeout on success
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            const exists = userDoc.exists();
            console.log('checkUserExists: Document fetched, exists:', exists);
            return exists;
          })
          .catch((error) => {
            // Clear timeout on error
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            throw error;
          });
        
        // Race between Firestore call and timeout
        const result = await Promise.race([docPromise, timeoutPromise]);
        console.log('checkUserExists: Successfully checked user, exists:', result);
        return result as boolean;
      } catch (error: any) {
        // Ensure timeout is cleared
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        lastError = error;
        const isLastAttempt = attempt === MAX_RETRIES - 1;
        
        // Handle specific error codes
        if (error.code === 'permission-denied') {
          console.warn('checkUserExists: Permission denied');
          // Permission errors are definitive - user likely doesn't exist or rules block access
          // Return false but don't throw (allows signup flow)
          return false;
        }
        
        // For timeout/network errors, retry unless it's the last attempt
        const isTimeoutOrNetworkError = 
          error.message?.includes('timeout') ||
          error.code === 'unavailable' ||
          error.code === 'deadline-exceeded' ||
          error.message?.includes('network') ||
          error.code === 'cancelled';
        
        if (isTimeoutOrNetworkError && !isLastAttempt) {
          // Exponential backoff: wait 1s, 2s, 4s
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.warn(`checkUserExists: Retryable error (${error.message}), retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue; // Retry
        }
        
        // If it's the last attempt or a non-retryable error, throw
        if (isLastAttempt) {
          console.error('checkUserExists: All retry attempts failed:', error);
          console.error('checkUserExists: Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
          });
          // Format a user-friendly error message
          if (isTimeoutOrNetworkError) {
            throw new Error('Unable to check user. Please check your internet connection and try again.');
          }
          throw new Error(`Failed to check user: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Failed to check user after retries');
  };

  const resetOTP = () => {
    setOtpState({
      attempts: 0,
      isVerified: false,
      isLoading: false,
      isLoadingVerification: false,
    });
  };

  return {
    ...otpState,
    sendOTPCode,
    verifyOTPCode,
    checkUserExists,
    resetOTP,
  };
};


