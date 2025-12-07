import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOTP } from '../../../../hooks/useOTP';
import { useAuth } from '../../../../contexts/AuthContext';
import { emailSchema, userNameSchema, ffIdSchema, passwordSchema, otpSchema } from '../../../../utils/validations';
import { verifyOTP } from '../../../../services/otpService';
import toast from 'react-hot-toast';

type LoginStep = 'email' | 'login' | 'signup' | 'otp' | 'forgot_password' | 'reset_password';
type FlowType = 'login' | 'signup' | 'forgot_password';

interface SignupData {
  name: string;
  ff_id: string;
  email: string;
  password?: string;
}

export interface UseLoginViewModelReturn {
  // State
  email: string;
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
  setEmail: (value: string) => void;
  setEnteredOTP: (value: string) => void;
  setName: (value: string) => void;
  setFfId: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmNewPassword: (value: string) => void;
  handleEmailSubmit: (e?: React.FormEvent) => Promise<void>;
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
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<LoginStep>('email');
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
  const [isOTPVerifiedForReset, setIsOTPVerifiedForReset] = useState(false);

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

  const handleEmailSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (isLoading || isCheckingUser) {
      return;
    }

    setIsCheckingUser(true);

    try {
      emailSchema.parse(email);

      let userExists = false;
      try {
        userExists = await checkUserExists(email);
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
        const success = await sendOTPCode(email);
        if (success) {
          setStep('signup');
        } else {
          toast.error('Failed to send OTP. Please try again.');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid email address');
    } finally {
      setIsCheckingUser(false);
    }
  }, [email, isLoading, isCheckingUser, checkUserExists, sendOTPCode]);

  const handlePasswordLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!password) {
        toast.error('Please enter your password');
        return;
      }

      const success = await loginWithPassword(email, password);
      if (success) {
        await login(email);
        navigate('/');
        // Reset form
        setEmail('');
        setPassword('');
        setStep('email');
        resetOTP();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    }
  }, [email, password, loginWithPassword, login, navigate, resetOTP]);

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
        const result = await verifyOTP(email, enteredOTP);
        
        if (result.success) {
          // Mark OTP as verified before allowing access to reset password screen
          setIsOTPVerifiedForReset(true);
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
      ? { name, ff_id: ffId, email, password }
      : undefined;

    try {
      const success = await verifyOTPCode(enteredOTP, email, signupData);

      if (success) {
        await login(email);
        navigate('/');
        // Reset form
        setEmail('');
        setEnteredOTP('');
        setName('');
        setFfId('');
        setPassword('');
        setConfirmPassword('');
        setStep('email');
        setIsNewUser(false);
        setFlowType('login');
        resetOTP();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify OTP');
    }
  }, [isNewUser, name, ffId, email, password, enteredOTP, flowType, verifyOTPCode, login, navigate, resetOTP]);

  const handleForgotPassword = useCallback(async () => {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        toast.error('Please enter your email address first');
        return;
      }

      emailSchema.parse(email);
      setFlowType('forgot_password');
      setIsOTPVerifiedForReset(false); // Reset verification state
      const success = await sendOTPCode(email);
      
      if (success) {
        setStep('otp');
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    }
  }, [email, sendOTPCode]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security check: Only allow password reset if OTP was verified
    if (!isOTPVerifiedForReset) {
      toast.error('Please verify OTP first');
      setStep('login');
      setFlowType('login');
      return;
    }
    
    try {
      passwordSchema.parse(newPassword);
      
      if (newPassword !== confirmNewPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // OTP is already verified in handleOTPSubmit, so skip verification
      const success = await resetPassword(email, enteredOTP, newPassword, true);
      
      if (success) {
        toast.success('Password reset successfully! You can now login with your new password.');
        // Reset form and go back to login
        setEmail('');
        setEnteredOTP('');
        setNewPassword('');
        setConfirmNewPassword('');
        setStep('email');
        setFlowType('login');
        setIsOTPVerifiedForReset(false);
        resetOTP();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    }
  }, [email, enteredOTP, newPassword, confirmNewPassword, isOTPVerifiedForReset, resetPassword, resetOTP]);

  // Security: Protect reset_password step - only allow if OTP was verified
  useEffect(() => {
    if (step === 'reset_password' && !isOTPVerifiedForReset) {
      // If somehow user gets to reset_password without OTP verification, redirect to login
      toast.error('Please verify OTP first');
      setStep('login');
      setFlowType('login');
      setIsOTPVerifiedForReset(false);
      resetOTP();
    }
  }, [step, isOTPVerifiedForReset, resetOTP]);

  const handleBack = useCallback(() => {
    if (step === 'signup') {
      setStep('email');
      setName('');
      setFfId('');
      setPassword('');
      setConfirmPassword('');
    } else if (step === 'login') {
      setStep('email');
      setPassword('');
    } else if (step === 'otp' && flowType === 'forgot_password') {
      // Security fix: Go back to login step, not reset_password
      // Reset OTP verification state
      setIsOTPVerifiedForReset(false);
      setStep('login');
      setEnteredOTP('');
      setFlowType('login');
      resetOTP();
    } else if (step === 'reset_password') {
      // Security fix: Go back to login step (or email if no login step)
      // Only allow access to reset_password if OTP was verified
      setIsOTPVerifiedForReset(false);
      setStep('login');
      setNewPassword('');
      setConfirmNewPassword('');
      setEnteredOTP('');
      setFlowType('login');
      resetOTP();
    } else {
      setStep('email');
      setEnteredOTP('');
      resetOTP();
    }
  }, [step, flowType, resetOTP]);

  return {
    // State
    email,
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
    setEmail,
    setEnteredOTP,
    setName,
    setFfId,
    setPassword,
    setConfirmPassword,
    setNewPassword,
    setConfirmNewPassword,
    handleEmailSubmit,
    handlePasswordLogin,
    handleSignupSubmit,
    handleOTPSubmit,
    handleForgotPassword,
    handleResetPassword,
    handleBack,
  };
};
