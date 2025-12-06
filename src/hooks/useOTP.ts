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
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log('checkUserExists: Starting check for mobile:', mobileNumber);
      const userRef = doc(firestore, 'users', mobileNumber);
      console.log('checkUserExists: Firestore reference created');
      
      // Create a timeout promise that properly rejects
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.warn('checkUserExists: Timeout after 8 seconds, treating as new user');
          reject(new Error('User check timeout - proceeding as new user'));
        }, 8000);
      });
      
      // Create the Firestore promise
      const docPromise = getDoc(userRef).then((userDoc) => {
        // Clear timeout if we got a response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.log('checkUserExists: Document fetched, exists:', userDoc.exists());
        return userDoc.exists();
      }).catch((error) => {
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        throw error;
      });
      
      // Race between Firestore call and timeout
      const result = await Promise.race([docPromise, timeoutPromise]);
      console.log('checkUserExists: Result:', result);
      return result as boolean;
    } catch (error: any) {
      // Ensure timeout is cleared
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.error('checkUserExists: Error checking user:', error);
      console.error('checkUserExists: Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      // If it's a permission error, assume user doesn't exist (new user flow)
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('checkUserExists: Permission denied - treating as new user');
        return false;
      }
      
      // If it's a timeout error, treat as new user
      if (error.message?.includes('timeout')) {
        console.warn('checkUserExists: Timeout occurred - treating as new user');
        return false;
      }
      
      // For network errors or other errors, also default to false (new user) to allow signup flow
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded' || error.message?.includes('network')) {
        console.warn('checkUserExists: Network error - treating as new user');
        return false;
      }
      
      // For other errors, also default to false (new user) to allow signup flow
      return false;
    }
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


