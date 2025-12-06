import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, addDoc } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { generateAddMoneyUPIString } from '../services/upiService';
import { withdrawalSchema } from '../utils/validations';
import { MIN_WITHDRAW, PRESET_WITHDRAWAL_AMOUNTS } from '../utils/constants';
import { useAppSettings } from '../hooks/useAppSettings';
import { useFirestoreTransaction } from '../hooks/useFirestoreTransaction';
import { Payment } from '../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Preset amounts for adding money
const PRESET_AMOUNTS = [100, 200, 500, 1000];

export const MoneyPage: React.FC = () => {
  const { user } = useAuth();
  const { points } = usePoints();
  const { withdrawalCommission } = useAppSettings();
  const { deductPoints } = useFirestoreTransaction();
  const [activeTab, setActiveTab] = useState<'add' | 'withdraw' | 'history'>('add');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedWithdrawAmount, setSelectedWithdrawAmount] = useState<number | null>(null);
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    bank_account_no?: string;
    ifsc_code?: string;
    amount?: string;
  }>({});

  const [payments, loading] = (useCollection(
    user
      ? query(
          collection(firestore, 'payments'),
          where('user_mobile', '==', user.mobile_no)
        )
      : null
  ) as unknown as [{ docs: any[] } | null, boolean]) || [null, true];

  const handleAddMoney = async () => {
    if (!user) {
      toast.error('Please login');
      return;
    }

    if (!selectedAmount) {
      toast.error('Please select an amount');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment request for admin approval
      await addDoc(collection(firestore, 'payments'), {
        user_mobile: user.mobile_no,
        user_name: user.name || 'Unknown',
        amount: selectedAmount,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Generate UPI payment link and open payment app
      const upiString = generateAddMoneyUPIString(
        selectedAmount,
        `Add ${selectedAmount} Points - ${user.mobile_no}`
      );

      // Open UPI payment app
      window.location.href = upiString;

      toast.success(
        'Payment request sent! Complete the payment in your UPI app. Admin will verify and approve.',
        { duration: 5000 }
      );

      setSelectedAmount(null);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate commission and final amount
  const withdrawalCalculation = useMemo(() => {
    if (!selectedWithdrawAmount) return null;

    const commissionAmount = (selectedWithdrawAmount * withdrawalCommission) / 100;
    const finalAmount = selectedWithdrawAmount - commissionAmount;

    return {
      amount: selectedWithdrawAmount,
      commission: commissionAmount,
      final: finalAmount,
      commissionPercent: withdrawalCommission,
    };
  }, [selectedWithdrawAmount, withdrawalCommission]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login');
      return;
    }

    if (!selectedWithdrawAmount) {
      toast.error('Please select an amount');
      return;
    }

    if (points < MIN_WITHDRAW) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAW} points`);
      return;
    }

    if (selectedWithdrawAmount > points) {
      toast.error('Insufficient points');
      return;
    }

    // Clear previous errors
    setFieldErrors({});

    setIsProcessing(true);

    try {
      const withdrawalData = withdrawalSchema.parse({
        amount: selectedWithdrawAmount,
        bank_account_no: bankAccountNo,
        ifsc_code: ifscCode,
      });

      const commissionAmount = (selectedWithdrawAmount * withdrawalCommission) / 100;
      const finalAmount = selectedWithdrawAmount - commissionAmount;

      // Deduct points immediately
      const deducted = await deductPoints(user.mobile_no, selectedWithdrawAmount);
      if (!deducted) {
        setIsProcessing(false);
        return;
      }

      // Create withdrawal request
      await addDoc(collection(firestore, 'payments'), {
        user_mobile: user.mobile_no,
        user_name: user.name || 'Unknown',
        amount: selectedWithdrawAmount,
        bank_account_no: withdrawalData.bank_account_no,
        ifsc_code: withdrawalData.ifsc_code,
        commission_amount: commissionAmount,
        final_amount: finalAmount,
        status: 'pending',
        type: 'withdrawal',
        created_at: new Date(),
        updated_at: new Date(),
      });

      toast.success('Withdrawal request submitted successfully!', { duration: 5000 });
      
      // Reset form
      setSelectedWithdrawAmount(null);
      setBankAccountNo('');
      setIfscCode('');
      setFieldErrors({});
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      
      // Handle Zod validation errors
      if (error.issues && Array.isArray(error.issues)) {
        const errors: { bank_account_no?: string; ifsc_code?: string; amount?: string } = {};
        
        error.issues.forEach((issue: any) => {
          const field = issue.path[0];
          if (field === 'bank_account_no') {
            errors.bank_account_no = issue.message;
          } else if (field === 'ifsc_code') {
            errors.ifsc_code = issue.message;
          } else if (field === 'amount') {
            errors.amount = issue.message;
          }
        });
        
        setFieldErrors(errors);
        
        // Show first error as toast as well
        const firstError = Object.values(errors)[0];
        if (firstError) {
          toast.error(firstError);
        }
      } else {
        toast.error(error.message || 'Failed to submit withdrawal');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20 pt-20">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary border border-primary rounded-lg p-6 mb-6"
        >
          <h2 className="text-2xl font-heading text-primary mb-2">Your Balance</h2>
          <p className="text-4xl font-heading text-primary">{points} pts</p>
        </motion.div>

        <div className="flex gap-2 mb-6">
          {(['add', 'withdraw', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg font-heading transition ${
                activeTab === tab
                  ? 'bg-primary text-bg'
                  : 'bg-bg-secondary text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'add' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-bg-secondary rounded-lg p-6"
          >
            <h3 className="text-xl font-heading text-primary mb-4">Add Money</h3>
            <p className="text-sm text-gray-400 mb-6">
              Select an amount to add. You'll be redirected to your UPI app to complete the payment.
            </p>

            {/* Preset Amount Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {PRESET_AMOUNTS.map((amount) => (
                <motion.button
                  key={amount}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedAmount(amount)}
                  className={`py-4 px-6 rounded-lg font-heading text-lg transition-all border-2 ${
                    selectedAmount === amount
                      ? 'bg-primary text-bg border-primary shadow-lg shadow-primary/30'
                      : 'bg-bg border-gray-700 text-white hover:border-primary/50'
                  }`}
                >
                  ₹{amount}
                </motion.button>
              ))}
            </div>

            {/* Selected Amount Display */}
            {selectedAmount && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg border border-primary/30 rounded-lg p-4 mb-6"
              >
                <p className="text-gray-400 text-sm">Selected Amount</p>
                <p className="text-2xl font-heading text-primary">₹{selectedAmount}</p>
              </motion.div>
            )}

            {/* Pay Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleAddMoney}
              disabled={!selectedAmount || isProcessing}
              className="w-full bg-primary text-bg py-4 rounded-lg font-heading text-lg hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Pay with UPI
                </>
              )}
            </motion.button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              After payment, admin will verify and approve your points within 24 hours.
            </p>
          </motion.div>
        )}

        {activeTab === 'withdraw' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-bg-secondary rounded-lg p-6"
          >
            <h3 className="text-xl font-heading text-primary mb-4">Withdraw Money</h3>
            <p className="text-sm text-gray-400 mb-4">
              Minimum withdrawal: {MIN_WITHDRAW} points | Commission: {withdrawalCommission}%
            </p>

            <form onSubmit={handleWithdraw} className="space-y-4">
                {/* Preset Amount Buttons */}
                <div>
                  <label className="block text-sm mb-2">Select Amount (Points)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PRESET_WITHDRAWAL_AMOUNTS.map((amount) => (
                      <motion.button
                        key={amount}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedWithdrawAmount(amount);
                          if (fieldErrors.amount) {
                            setFieldErrors({ ...fieldErrors, amount: undefined });
                          }
                        }}
                        disabled={amount > points}
                        className={`py-3 px-4 rounded-lg font-heading transition-all border-2 ${
                          selectedWithdrawAmount === amount
                            ? 'bg-primary text-bg border-primary shadow-lg shadow-primary/30'
                            : 'bg-bg border-gray-700 text-white hover:border-primary/50'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {amount} pts
                      </motion.button>
                    ))}
                  </div>
                  {fieldErrors.amount && (
                    <p className="text-red-400 text-xs mt-2">{fieldErrors.amount}</p>
                  )}
                </div>

                {/* Commission Breakdown */}
                {withdrawalCalculation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-bg border border-primary/30 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Withdrawal Amount:</span>
                      <span className="text-white font-heading">{withdrawalCalculation.amount} pts</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Commission ({withdrawalCalculation.commissionPercent}%):</span>
                      <span className="text-red-400">-{withdrawalCalculation.commission.toFixed(2)} pts</span>
                    </div>
                    <div className="border-t border-gray-700 pt-2 flex justify-between">
                      <span className="text-primary font-heading">Final Amount:</span>
                      <span className="text-primary font-heading text-lg">{withdrawalCalculation.final.toFixed(2)} pts</span>
                    </div>
                  </motion.div>
                )}

                {/* Bank Account Number */}
                <div>
                  <label className="block text-sm mb-2">Bank Account Number</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => {
                      setBankAccountNo(e.target.value.replace(/\D/g, ''));
                      if (fieldErrors.bank_account_no) {
                        setFieldErrors({ ...fieldErrors, bank_account_no: undefined });
                      }
                    }}
                    placeholder="Enter 9-18 digit account number"
                    maxLength={18}
                    className={`w-full bg-bg border rounded-lg px-4 py-2 focus:outline-none ${
                      fieldErrors.bank_account_no
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-700 focus:border-primary'
                    }`}
                    required
                  />
                  {fieldErrors.bank_account_no && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.bank_account_no}</p>
                  )}
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-sm mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => {
                      setIfscCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                      if (fieldErrors.ifsc_code) {
                        setFieldErrors({ ...fieldErrors, ifsc_code: undefined });
                      }
                    }}
                    placeholder="ABCD0123456"
                    maxLength={11}
                    className={`w-full bg-bg border rounded-lg px-4 py-2 focus:outline-none uppercase ${
                      fieldErrors.ifsc_code
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-700 focus:border-primary'
                    }`}
                    required
                  />
                  {fieldErrors.ifsc_code ? (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.ifsc_code}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Format: 4 letters + 0 + 6 alphanumeric</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!selectedWithdrawAmount || points < MIN_WITHDRAW || selectedWithdrawAmount > points || isProcessing || !bankAccountNo || !ifscCode}
                  className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Request Withdrawal'
                  )}
                </button>
              </form>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-bg-secondary rounded-lg p-6"
          >
            <h3 className="text-xl font-heading text-primary mb-4">Transaction History</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : payments && payments.docs.length > 0 ? (
              <div className="space-y-3">
                {payments.docs
                  .map((doc: any) => {
                    const data = doc.data();
                    return {
                      id: doc.id,
                      ...data,
                      created_at:
                        data.created_at instanceof Date
                          ? data.created_at
                          : (data.created_at as any)?.toDate?.() || new Date(),
                      updated_at:
                        data.updated_at instanceof Date
                          ? data.updated_at
                          : (data.updated_at as any)?.toDate?.() || new Date(),
                      approved_at:
                        data.approved_at instanceof Date
                          ? data.approved_at
                          : (data.approved_at as any)?.toDate?.() || undefined,
                    } as Payment;
                  })
                  .sort((a, b) => {
                    // Sort by status: pending first, then by time (most recent first)
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    // Both have same status priority, sort by time (most recent first)
                    return b.created_at.getTime() - a.created_at.getTime();
                  })
                  .map((payment) => {

                  const isWithdrawal = payment.type === 'withdrawal';
                  const isTournamentWinning = payment.type === 'tournament_winning';

                  return (
                    <div
                      key={payment.id}
                      className="bg-bg border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-heading text-primary flex items-center gap-2">
                            {isWithdrawal ? (
                              <span className="text-red-400">-</span>
                            ) : (
                              <span className="text-green-400">+</span>
                            )}
                            {payment.amount} points
                          </p>
                          <p className="text-xs text-gray-500">
                            {isWithdrawal 
                              ? 'Withdrawal' 
                              : isTournamentWinning 
                              ? payment.tournament_name 
                                ? `Tournament Win: ${payment.tournament_name}`
                                : 'Tournament Win'
                              : 'Add Money'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {payment.created_at.toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            payment.status === 'approved'
                              ? 'bg-green-900 text-green-300'
                              : payment.status === 'rejected'
                              ? 'bg-red-900 text-red-400'
                              : 'bg-yellow-800 text-yellow-300'
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No transactions yet</div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
