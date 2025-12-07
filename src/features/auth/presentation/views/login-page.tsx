import React from 'react';
import { motion } from 'framer-motion';
import { useLoginViewModel } from '../viewmodels/useLoginViewModel';
import { HiMail, HiKey, HiUser, HiIdentification, HiLockClosed } from 'react-icons/hi';

export const LoginPage: React.FC = () => {
  const {
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
  } = useLoginViewModel();

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Enter your email address to get started';
      case 'login':
        return 'Enter your password to login';
      case 'signup':
        return 'Create your account';
      case 'otp':
        return flowType === 'forgot_password'
          ? 'Verify OTP to reset password'
          : 'Enter the OTP sent to your email';
      case 'reset_password':
        return 'Set your new password';
      default:
        return 'Welcome to BattleManager';
    }
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
              <img
                src="/applogo.png"
                alt="BattleManager Logo"
                className="w-20 h-20 rounded-lg object-contain mx-auto"
              />
            </motion.div>
            <h1 className="text-3xl font-heading text-primary mb-2 text-glow">
              BattleManager
            </h1>
            <p className="text-gray-400">{getStepTitle()}</p>
          </div>

          {/* Email Form */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6" noValidate>
              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiMail className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="your@email.com"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isCheckingUser || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-label="Continue"
              >
                {isLoading || isCheckingUser ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {isCheckingUser ? 'Checking...' : 'Sending OTP...'}
                  </>
                ) : (
                  <>
                    <HiKey className="text-xl" />
                    Continue
                  </>
                )}
              </button>
            </form>
          )}

          {/* Password Login Form (for existing users) */}
          {step === 'login' && (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiLockClosed className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-bg-tertiary border border-primary border-opacity-30 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  Email: <span className="text-primary">{email}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoadingPassword || !password}
                  className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoadingPassword ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-sm text-primary hover:text-primary/80 transition font-body"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full bg-bg-tertiary text-white py-3 rounded-lg font-body hover:bg-opacity-80 transition"
                >
                  Back
                </button>
              </div>
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

              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiLockClosed className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Min 8 chars, uppercase, lowercase, and number required
                </p>
              </div>

              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiLockClosed className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                  />
                </div>
              </div>

              <div className="bg-bg-tertiary border border-primary border-opacity-30 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  Email: <span className="text-primary">{email}</span>
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
                  disabled={!name.trim() || !ffId.trim() || !password || !confirmPassword}
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
                  OTP sent to: <span className="text-primary">{email}</span>
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
                  {isLoadingVerification
                    ? 'Verifying...'
                    : flowType === 'forgot_password'
                    ? 'Verify OTP'
                    : 'Verify & Login'}
                </button>
              </div>
            </form>
          )}

          {/* Reset Password Form */}
          {step === 'reset_password' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiLockClosed className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Min 8 chars, uppercase, lowercase, and number required
                </p>
              </div>

              <div>
                <label className="block text-sm font-body text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <HiLockClosed className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                    required
                  />
                </div>
              </div>

              <div className="bg-bg-tertiary border border-primary border-opacity-30 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  Email: <span className="text-primary">{email}</span>
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
                  disabled={isLoadingPassword || !newPassword || !confirmNewPassword}
                  className="flex-1 bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoadingPassword ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
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
