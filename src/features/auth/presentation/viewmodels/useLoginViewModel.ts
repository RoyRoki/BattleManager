import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOTP } from '../../../../hooks/useOTP';
import { useAuth } from '../../../../contexts/AuthContext';
import { mobileSchema, userNameSchema, ffIdSchema, passwordSchema, otpSchema } from '../../../../utils/validations';
import { verifyOTP } from '../../../../services/otpService';
import toast from 'react-hot-toast';

type LoginStep = 'mobile' | 'login' | 'signup' | 'otp' | 'forgot_password' | 'reset_password';
type FlowType = 'login' | 'signup' | 'forgot_password';

interface SignupData {
  name: string;
  ff_id: string;
  mobileNumber: string;
  password?: string;
}

export interface UseLoginViewModelReturn {
  // State
  mobileNumber: string;
  step: LoginStep;
  enteredOTP: string;
  name: string;
  ffId: string;
  password: string;
  confirmPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  isNewUser: boolean;
  isCheckingUser: boolean;
  isLoading: boolean;
  isLoadingVerification: boolean;
  isLoadingPassword: boolean;
  attempts: number;
  flowType: FlowType;

  // Actions
  setMobileNumber: (value: string) => void;
  setEnteredOTP: (value: string) => void;
  setName: (value: string) => void;
  setFfId: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmNewPassword: (value: string) => void;
  handleMobileSubmit: (e?: React.FormEvent) => Promise<void>;
  handlePasswordLogin: (e: React.FormEvent) => Promise<void>;
  handleSignupSubmit: (e: React.FormEvent) => Promise<void>;
  handleOTPSubmit: (e: React.FormEvent) => Promise<void>;
  handleForgotPassword: () => Promise<void>;
  handleResetPassword: (e: React.FormEvent) => Promise<void>;
  handleBack: () => void;
}

export const useLoginViewModel = (): UseLoginViewModelReturn => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [step, setStep] = useState<LoginStep>('mobile');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [name, setName] = useState('');
  const [ffId, setFfId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [flowType, setFlowType] = useState<FlowType>('login');

  const {
    sendOTPCode,
    verifyOTPCode,
    checkUserExists,
    loginWithPassword,
    resetPassword,
    isLoading,
    isLoadingVerification,
    isLoadingPassword,
    attempts,
    resetOTP,
  } = useOTP();

  const handleMobileSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (mobileNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (isLoading || isCheckingUser) {
      return;
    }

    setIsCheckingUser(true);

    try {
      mobileSchema.parse(mobileNumber);

      let userExists = false;
      try {
        userExists = await checkUserExists(mobileNumber);
      } catch (checkError: any) {
        const errorMessage = checkError.message || 'Failed to check user. Please try again.';

        if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('network') ||
          checkError.code === 'unavailable' ||
          checkError.code === 'deadline-exceeded'
        ) {
          toast.error('Connection issue. Please check your internet and try again.');
        } else {
          toast.error(errorMessage);
        }

        setIsCheckingUser(false);
        return;
      }

      setIsNewUser(!userExists);
      setFlowType(userExists ? 'login' : 'signup');

      if (userExists) {
        // Existing user - go to password login
        setStep('login');
      } else {
        // New user - send OTP and go to signup
        const success = await sendOTPCode(mobileNumber);
        if (success) {
          setStep('signup');
        } else {
          toast.error('Failed to send OTP. Please try again.');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid mobile number');
    } finally {
      setIsCheckingUser(false);
    }
  }, [mobileNumber, isLoading, isCheckingUser, checkUserExists, sendOTPCode]);

  const handlePasswordLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!password) {
        toast.error('Please enter your password');
        return;
      }

      const success = await loginWithPassword(mobileNumber, password);
      if (success) {
        await login(mobileNumber);
        navigate('/');
        // Reset form
        setMobileNumber('');
        setPassword('');
        setStep('mobile');
        resetOTP();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    }
  }, [mobileNumber, password, loginWithPassword, login, navigate, resetOTP]);

  const handleSignupSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      userNameSchema.parse(name);
      ffIdSchema.parse(ffId);
      passwordSchema.parse(password);
      
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      setStep('otp');
    } catch (error: any) {
      toast.error(error.message || 'Please check your input');
    }
  }, [name, ffId, password, confirmPassword]);

  const handleOTPSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // For forgot password flow, verify OTP directly without creating/updating user
    if (flowType === 'forgot_password') {
      try {
        otpSchema.parse(enteredOTP);
        const result = await verifyOTP(mobileNumber, enteredOTP);
        
        if (result.success) {
          setStep('reset_password');
        } else {
          if (result.remainingAttempts !== undefined && result.remainingAttempts > 0) {
            toast.error(
              result.error || `Invalid OTP. ${result.remainingAttempts} attempts remaining.`
            );
          } else {
            toast.error(result.error || 'Maximum attempts exceeded. Please request a new OTP.');
          }
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to verify OTP');
      }
      return;
    }

    const signupData: SignupData | undefined = isNewUser
      ? { name, ff_id: ffId, mobileNumber, password }
      : undefined;

    try {
      const success = await verifyOTPCode(enteredOTP, mobileNumber, signupData);

      if (success) {
        await login(mobileNumber);
        navigate('/');
        // Reset form
        setMobileNumber('');
        setEnteredOTP('');
        setName('');
        setFfId('');
        setPassword('');
        setConfirmPassword('');
        setStep('mobile');
        setIsNewUser(false);
        setFlowType('login');
        resetOTP();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify OTP');
    }
  }, [isNewUser, name, ffId, mobileNumber, password, enteredOTP, flowType, verifyOTPCode, login, navigate, resetOTP]);

  const handleForgotPassword = useCallback(async () => {
    try {
      if (!mobileNumber || mobileNumber.length !== 10) {
        toast.error('Please enter your mobile number first');
        return;
      }

      mobileSchema.parse(mobileNumber);
      setFlowType('forgot_password');
      const success = await sendOTPCode(mobileNumber);
      
      if (success) {
        setStep('otp');
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    }
  }, [mobileNumber, sendOTPCode]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      passwordSchema.parse(newPassword);
      
      if (newPassword !== confirmNewPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // OTP is already verified in handleOTPSubmit, so skip verification
      const success = await resetPassword(mobileNumber, enteredOTP, newPassword, true);
      
      if (success) {
        toast.success('Password reset successfully! You can now login with your new password.');
        // Reset form and go back to login
        setMobileNumber('');
        setEnteredOTP('');
        setNewPassword('');
        setConfirmNewPassword('');
        setStep('mobile');
        setFlowType('login');
        resetOTP();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    }
  }, [mobileNumber, enteredOTP, newPassword, confirmNewPassword, resetPassword, resetOTP]);

  const handleBack = useCallback(() => {
    if (step === 'signup') {
      setStep('mobile');
      setName('');
      setFfId('');
      setPassword('');
      setConfirmPassword('');
    } else if (step === 'login') {
      setStep('mobile');
      setPassword('');
    } else if (step === 'otp' && flowType === 'forgot_password') {
      // After OTP verification in forgot password flow, go to reset password
      setStep('reset_password');
    } else if (step === 'reset_password') {
      setStep('mobile');
      setNewPassword('');
      setConfirmNewPassword('');
      setEnteredOTP('');
      setFlowType('login');
      resetOTP();
    } else {
      setStep('mobile');
      setEnteredOTP('');
      resetOTP();
    }
  }, [step, flowType, resetOTP]);

  return {
    // State
    mobileNumber,
    step,
    enteredOTP,
    name,
    ffId,
    password,
    confirmPassword,
    newPassword,
    confirmNewPassword,
    isNewUser,
    isCheckingUser,
    isLoading,
    isLoadingVerification,
    isLoadingPassword,
    attempts,
    flowType,

    // Actions
    setMobileNumber,
    setEnteredOTP,
    setName,
    setFfId,
    setPassword,
    setConfirmPassword,
    setNewPassword,
    setConfirmNewPassword,
    handleMobileSubmit,
    handlePasswordLogin,
    handleSignupSubmit,
    handleOTPSubmit,
    handleForgotPassword,
    handleResetPassword,
    handleBack,
  };
};
