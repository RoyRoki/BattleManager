import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiShieldCheck, HiPhone, HiKey, HiUser, HiIdentification, HiMail } from 'react-icons/hi';
import { useLoginViewModel } from '../viewmodels/useLoginViewModel';

export const LoginPage: React.FC = () => {
  const {
    step,
    mobileNumber,
    enteredOTP,
    name,
    ffId,
    isLoading,
    isCheckingUser,
    isLoadingVerification,
    attempts,
    isAdminMode,
    adminEmail,
    adminPassword,
    isAdminLoading,
    setMobileNumber,
    setEnteredOTP,
    setName,
    setFfId,
    setAdminEmail,
    setAdminPassword,
    toggleAdminMode,
    handleMobileSubmit,
    handleSignupSubmit,
    handleOTPSubmit,
    handleAdminLogin,
    handleBack,
  } = useLoginViewModel();

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

  const handleSendOTPClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log('Button clicked directly');
    handleMobileSubmit();
  };

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
                : step === 'admin'
                ? 'Admin Login'
                : 'Enter the OTP sent to your mobile'}
            </p>
          </div>

          {/* Admin/User Mode Toggle */}
          {step === 'mobile' && (
            <div className="mb-6 flex items-center justify-center">
              <button
                type="button"
                onClick={toggleAdminMode}
                className="text-xs text-gray-400 hover:text-primary transition"
              >
                {isAdminMode ? 'Switch to User Login' : 'Admin Login'}
              </button>
            </div>
          )}

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
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body text-center text-2xl tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    maxLength={6}
                    required
                    autoFocus
                    disabled={isLoadingVerification}
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
                  disabled={isLoadingVerification}
                  className="flex-1 bg-bg-tertiary text-white py-3 rounded-lg font-body hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Admin Login Form */}
          {step === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiMail className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiKey className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdminLoading || !adminEmail || !adminPassword}
                className="w-full bg-accent text-white py-3 rounded-lg font-heading hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAdminLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <HiShieldCheck className="text-xl" />
                    Login as Admin
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full bg-bg-tertiary text-white py-3 rounded-lg font-body hover:bg-opacity-80 transition"
              >
                Back to User Login
              </button>
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

