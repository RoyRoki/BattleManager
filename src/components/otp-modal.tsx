import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOTP } from '../hooks/useOTP';
import { emailSchema } from '../utils/validations';
import toast from 'react-hot-toast';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const OTPModal: React.FC<OTPModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [enteredOTP, setEnteredOTP] = useState('');
  const {
    sendOTPCode,
    verifyOTPCode,
    isLoading,
    isLoadingVerification,
    attempts,
  } = useOTP();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      const success = await sendOTPCode(email);
      if (success) {
        setStep('otp');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid email address');
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await verifyOTPCode(enteredOTP, email);
    if (success) {
      onSuccess(email);
      onClose();
      // Reset form
      setEmail('');
      setEnteredOTP('');
      setStep('email');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-bg-secondary border border-primary rounded-lg p-6 max-w-md w-full"
        >
          <h2 className="text-2xl font-heading text-primary mb-4">Login</h2>

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-4">
                <label className="block text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="your@email.com"
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-bg py-2 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit}>
              <div className="mb-4">
                <label className="block text-sm mb-2">Enter OTP</label>
                <input
                  type="text"
                  value={enteredOTP}
                  onChange={(e) => setEnteredOTP(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                {attempts > 0 && (
                  <p className="text-sm text-accent mt-2">
                    Attempts: {attempts}/3
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="flex-1 bg-bg-tertiary text-white py-2 rounded-lg hover:bg-opacity-80 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoadingVerification}
                  className="flex-1 bg-primary text-bg py-2 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50"
                >
                  {isLoadingVerification ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          <button
            onClick={onClose}
            className="mt-4 w-full text-gray-400 hover:text-primary transition"
          >
            Cancel
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


