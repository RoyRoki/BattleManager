import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { SendOTPUseCase } from '../../domain/usecases/SendOTPUseCase';
import { VerifyOTPUseCase } from '../../domain/usecases/VerifyOTPUseCase';
import { CheckUserExistsUseCase } from '../../domain/usecases/CheckUserExistsUseCase';
import { createAuthRepository } from '../../data/repositories/AuthRepositoryFactory';
import { SignupData } from '../../domain/entities/User';
import { mobileSchema, userNameSchema, ffIdSchema } from '../../../../utils/validations';
import toast from 'react-hot-toast';

export type LoginStep = 'mobile' | 'signup' | 'otp';

export interface LoginViewModelState {
  step: LoginStep;
  mobileNumber: string;
  enteredOTP: string;
  name: string;
  ffId: string;
  isNewUser: boolean;
  isLoading: boolean;
  isCheckingUser: boolean;
  isLoadingVerification: boolean;
  attempts: number;
}

export interface LoginViewModelHandlers {
  setMobileNumber: (value: string) => void;
  setEnteredOTP: (value: string) => void;
  setName: (value: string) => void;
  setFfId: (value: string) => void;
  handleMobileSubmit: (e?: React.FormEvent) => Promise<void>;
  handleSignupSubmit: (e: React.FormEvent) => Promise<void>;
  handleOTPSubmit: (e: React.FormEvent) => Promise<void>;
  handleBack: () => void;
  reset: () => void;
}

export const useLoginViewModel = (): LoginViewModelState & LoginViewModelHandlers => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Initialize repository and use cases using factory
  // Using useMemo to avoid recreating on every render
  const authRepository = useMemo(() => createAuthRepository(), []);
  const sendOTPUseCase = useMemo(() => new SendOTPUseCase(authRepository), [authRepository]);
  const verifyOTPUseCase = useMemo(() => new VerifyOTPUseCase(authRepository), [authRepository]);
  const checkUserExistsUseCase = useMemo(() => new CheckUserExistsUseCase(authRepository), [authRepository]);

  // UI State
  const [step, setStep] = useState<LoginStep>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [name, setName] = useState('');
  const [ffId, setFfId] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleMobileSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    console.log('useLoginViewModel: handleMobileSubmit called', { mobileNumber, isLoading, step });

    // Validate mobile number length before proceeding
    if (mobileNumber.length !== 10) {
      console.warn('useLoginViewModel: Mobile number validation failed: length is', mobileNumber.length);
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (isLoading || isCheckingUser) {
      console.warn('useLoginViewModel: Already processing OTP request');
      return;
    }

    // Set loading state immediately
    setIsCheckingUser(true);

    try {
      console.log('useLoginViewModel: Validating mobile number with schema');
      mobileSchema.parse(mobileNumber);

      console.log('useLoginViewModel: Checking if user exists');
      // Check if user exists - handle errors gracefully
      let userExists = false;
      try {
        userExists = await checkUserExistsUseCase.execute(mobileNumber);
        console.log('useLoginViewModel: User exists check completed:', userExists);
      } catch (checkError: any) {
        console.warn('useLoginViewModel: Error checking user existence, proceeding as new user:', checkError);
        userExists = false;
      }

      setIsNewUser(!userExists);
      console.log('useLoginViewModel: isNewUser set to:', !userExists);

      // Clear checking state before starting OTP send
      setIsCheckingUser(false);

      console.log('useLoginViewModel: Sending OTP code');
      setIsLoading(true);
      try {
        await sendOTPUseCase.execute(mobileNumber);
        console.log('useLoginViewModel: OTP sent successfully');
        toast.success('OTP sent successfully!');

        // If new user, show signup form, otherwise go to OTP
        const nextStep = userExists ? 'otp' : 'signup';
        console.log('useLoginViewModel: Moving to step:', nextStep);
        setStep(nextStep);
      } catch (error: any) {
        console.error('useLoginViewModel: Error sending OTP:', error);
        toast.error(error.message || 'Failed to send OTP. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('useLoginViewModel: Error in handleMobileSubmit:', error);
      console.error('useLoginViewModel: Error stack:', error.stack);
      toast.error(error.message || 'Invalid mobile number');
      setIsCheckingUser(false);
      setIsLoading(false);
    } finally {
      // Ensure checking state is always cleared
      setIsCheckingUser(false);
    }
  }, [mobileNumber, isLoading, isCheckingUser, step, sendOTPUseCase, checkUserExistsUseCase]);

  const handleSignupSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('useLoginViewModel: handleSignupSubmit called', { name, ffId });

    try {
      userNameSchema.parse(name);
      ffIdSchema.parse(ffId);

      console.log('useLoginViewModel: Signup validation passed, moving to OTP step');
      setStep('otp');
    } catch (error: any) {
      console.error('useLoginViewModel: Error in handleSignupSubmit:', error);
      toast.error(error.message || 'Please check your input');
    }
  }, [name, ffId]);

  const handleOTPSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('useLoginViewModel: handleOTPSubmit called', { enteredOTP, mobileNumber, isNewUser });

    const signupData: SignupData | undefined = isNewUser
      ? { name, ff_id: ffId, mobileNumber }
      : undefined;

    setIsLoadingVerification(true);
    try {
      const result = await verifyOTPUseCase.execute(mobileNumber, enteredOTP, signupData);
      console.log('useLoginViewModel: OTP verification result:', result);

      if (result.success) {
        console.log('useLoginViewModel: OTP verified, logging in user');
        await login(mobileNumber);
        navigate('/');
        // Reset form will be handled by reset function
        reset();
      } else {
        // Handle OTP verification failure
        setAttempts((prev) => prev + 1);
        if (result.remainingAttempts !== undefined && result.remainingAttempts > 0) {
          toast.error(result.error || `Invalid OTP. ${result.remainingAttempts} attempts remaining.`);
        } else {
          toast.error(result.error || 'Maximum attempts exceeded. Please request a new OTP.');
          setAttempts(0);
        }
      }
    } catch (error: any) {
      console.error('useLoginViewModel: Error in handleOTPSubmit:', error);
      toast.error(error.message || 'Failed to verify OTP');
      setAttempts((prev) => prev + 1);
    } finally {
      setIsLoadingVerification(false);
    }
  }, [enteredOTP, mobileNumber, isNewUser, name, ffId, verifyOTPUseCase, login, navigate]);

  const handleBack = useCallback(() => {
    if (step === 'signup') {
      setStep('mobile');
      setName('');
      setFfId('');
    } else {
      setStep('mobile');
      setEnteredOTP('');
      setAttempts(0);
      setIsLoadingVerification(false); // Clear verifying state when going back
    }
  }, [step]);

  const reset = useCallback(() => {
    setMobileNumber('');
    setEnteredOTP('');
    setName('');
    setFfId('');
    setStep('mobile');
    setIsNewUser(false);
    setAttempts(0);
    setIsLoading(false);
    setIsCheckingUser(false);
    setIsLoadingVerification(false);
  }, []);

  return {
    // State
    step,
    mobileNumber,
    enteredOTP,
    name,
    ffId,
    isNewUser,
    isLoading,
    isCheckingUser,
    isLoadingVerification,
    attempts,
    // Handlers
    setMobileNumber,
    setEnteredOTP,
    setName,
    setFfId,
    handleMobileSubmit,
    handleSignupSubmit,
    handleOTPSubmit,
    handleBack,
    reset,
  };
};

