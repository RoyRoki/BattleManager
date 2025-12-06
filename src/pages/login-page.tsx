import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOTP } from '../hooks/useOTP';
import { useAuth } from '../contexts/AuthContext';
import { mobileSchema, userNameSchema, ffIdSchema } from '../utils/validations';
import { HiShieldCheck, HiPhone, HiKey, HiUser, HiIdentification } from 'react-icons/hi';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [step, setStep] = useState<'mobile' | 'signup' | 'otp'>('mobile');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [name, setName] = useState('');
  const [ffId, setFfId] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const {
    sendOTPCode,
    verifyOTPCode,
    checkUserExists,
    isLoading,
    isLoadingVerification,
    attempts,
    resetOTP,
  } = useOTP();

  const handleMobileSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    console.log('handleMobileSubmit called', { mobileNumber, isLoading, step });
    
    // Validate mobile number length before proceeding
    if (mobileNumber.length !== 10) {
      console.warn('Mobile number validation failed: length is', mobileNumber.length);
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (isLoading || isCheckingUser) {
      console.warn('Already processing OTP request');
      return;
    }

    // Set loading state immediately
    setIsCheckingUser(true);

    try {
      console.log('Validating mobile number with schema');
      mobileSchema.parse(mobileNumber);
      
      console.log('Checking if user exists');
      // Check if user exists - handle errors properly
      let userExists = false;
      try {
        userExists = await checkUserExists(mobileNumber);
        console.log('User exists check completed:', userExists);
      } catch (checkError: any) {
        console.error('Error checking user existence:', checkError);
        // If check fails due to network/timeout, show error and don't proceed
        // This prevents existing users from being shown signup screen
        const errorMessage = checkError.message || 'Failed to check user. Please try again.';
        
        // Check if it's a network/timeout error
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
        
        // Don't proceed with OTP if we can't check user existence
        // User should retry after fixing connection
        setIsCheckingUser(false);
        return;
      }
      
      setIsNewUser(!userExists);
      console.log('isNewUser set to:', !userExists);

      console.log('Sending OTP code');
      const success = await sendOTPCode(mobileNumber);
      console.log('OTP send result:', success);
      
      if (success) {
        // If new user, show signup form, otherwise go to OTP
        const nextStep = userExists ? 'otp' : 'signup';
        console.log('Moving to step:', nextStep);
        setStep(nextStep);
      } else {
        console.error('Failed to send OTP');
        toast.error('Failed to send OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('Error in handleMobileSubmit:', error);
      console.error('Error stack:', error.stack);
      toast.error(error.message || 'Invalid mobile number');
    } finally {
      // Always clear the checking state
      setIsCheckingUser(false);
    }
  };

  const handleSendOTPClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log('Button clicked directly');
    handleMobileSubmit();
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSignupSubmit called', { name, ffId });
    try {
      userNameSchema.parse(name);
      ffIdSchema.parse(ffId);
      
      console.log('Signup validation passed, moving to OTP step');
      // After validation, move to OTP step
      setStep('otp');
    } catch (error: any) {
      console.error('Error in handleSignupSubmit:', error);
      toast.error(error.message || 'Please check your input');
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleOTPSubmit called', { enteredOTP, mobileNumber, isNewUser });
    
    const signupData = isNewUser
      ? { name, ff_id: ffId, mobileNumber }
      : undefined;

    try {
      const success = await verifyOTPCode(enteredOTP, mobileNumber, signupData);
      console.log('OTP verification result:', success);
      
      if (success) {
        console.log('OTP verified, logging in user');
        await login(mobileNumber);
        navigate('/');
        // Reset form
        setMobileNumber('');
        setEnteredOTP('');
        setName('');
        setFfId('');
        setStep('mobile');
        setIsNewUser(false);
        resetOTP();
      }
    } catch (error: any) {
      console.error('Error in handleOTPSubmit:', error);
      toast.error(error.message || 'Failed to verify OTP');
    }
  };

  const handleBack = () => {
    if (step === 'signup') {
      setStep('mobile');
      setName('');
      setFfId('');
    } else {
      setStep('mobile');
      setEnteredOTP('');
      resetOTP();
    }
  };

  // Debug: Track button state changes
  useEffect(() => {
    if (step === 'mobile') {
      const isButtonDisabled = isLoading || isCheckingUser || mobileNumber.length !== 10;
      console.log('Send OTP button state:', {
        isLoading,
        isCheckingUser,
        mobileNumberLength: mobileNumber.length,
        isButtonDisabled,
        mobileNumber,
      });
    }
  }, [step, isLoading, isCheckingUser, mobileNumber]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-bg-secondary border border-primary rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-block mb-4"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-primary">
                <HiShieldCheck className="text-4xl text-primary" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-heading text-primary mb-2 text-glow">
              BattleManager
            </h1>
            <p className="text-gray-400">
              {step === 'mobile'
                ? 'Enter your mobile number to get started'
                : step === 'signup'
                ? 'Create your account'
                : 'Enter the OTP sent to your mobile'}
            </p>
          </div>

          {/* Mobile Number Form */}
          {step === 'mobile' && (
            <form 
              onSubmit={(e) => {
                console.log('Form onSubmit triggered');
                handleMobileSubmit(e);
              }} 
              className="space-y-6"
              noValidate
            >
              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiPhone className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                onClick={handleSendOTPClick}
                disabled={isLoading || isCheckingUser || mobileNumber.length !== 10}
                className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-label="Send OTP"
              >
                {isLoading || isCheckingUser ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {isCheckingUser ? 'Checking...' : 'Sending OTP...'}
                  </>
                ) : (
                  <>
                    <HiKey className="text-xl" />
                    Send OTP
                  </>
                )}
              </button>
            </form>
          )}

          {/* Signup Form (for new users) */}
          {step === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Free Fire ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiIdentification className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={ffId}
                    onChange={(e) => setFfId(e.target.value)}
                    placeholder="Your Free Fire Player ID"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  6-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              <div className="bg-bg-tertiary border border-primary border-opacity-30 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  Mobile: <span className="text-primary">{mobileNumber}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-bg-tertiary text-white py-3 rounded-lg font-body hover:bg-opacity-80 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !ffId.trim()}
                  className="flex-1 bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to OTP
                </button>
              </div>
            </form>
          )}

          {/* OTP Form */}
          {step === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiKey className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={enteredOTP}
                    onChange={(e) => setEnteredOTP(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
                {attempts > 0 && (
                  <p className="text-sm text-accent mt-2">
                    Attempts remaining: {3 - attempts}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  OTP sent to: <span className="text-primary">{mobileNumber}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-bg-tertiary text-white py-3 rounded-lg font-body hover:bg-opacity-80 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoadingVerification || enteredOTP.length !== 6}
                  className="flex-1 bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingVerification ? 'Verifying...' : 'Verify & Login'}
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

