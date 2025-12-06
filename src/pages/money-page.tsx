import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, addDoc } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { PaymentProofUpload } from '../components/payment-proof-upload';
import { generateUPIString } from '../services/upiService';
import { paymentSchema, withdrawalSchema } from '../utils/validations';
import { MIN_WITHDRAW } from '../utils/constants';
import { Payment } from '../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const MoneyPage: React.FC = () => {
  const { user } = useAuth();
  const { points } = usePoints();
  const [activeTab, setActiveTab] = useState<'add' | 'withdraw' | 'history'>('add');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const [payments, loading] = (useCollection(
    user
      ? query(
          collection(firestore, 'payments'),
          where('user_mobile', '==', user.mobile_no),
          where('status', 'in', ['pending', 'approved', 'rejected'])
        )
      : null
  ) as unknown as [{ docs: any[] } | null, boolean]) || [null, true];

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login');
      return;
    }

    try {
      const paymentData = paymentSchema.parse({
        amount: parseFloat(amount),
        proof_url: proofUrl,
      });

      if (!proofUrl) {
        toast.error('Please upload payment proof');
        return;
      }

      await addDoc(collection(firestore, 'payments'), {
        user_mobile: user.mobile_no,
        amount: paymentData.amount,
        proof_url: paymentData.proof_url,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });

      toast.success('Payment request submitted! Waiting for admin approval.');
      setAmount('');
      setProofUrl('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit payment');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login');
      return;
    }

    if (points < MIN_WITHDRAW) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAW} points`);
      return;
    }

    try {
      const withdrawalData = withdrawalSchema.parse({
        amount: parseFloat(amount),
        upi_id: upiId,
      });

      if (withdrawalData.amount > points) {
        toast.error('Insufficient points');
        return;
      }

      // Create withdrawal request (similar to payment but different status)
      await addDoc(collection(firestore, 'payments'), {
        user_mobile: user.mobile_no,
        amount: withdrawalData.amount,
        upi_id: withdrawalData.upi_id,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });

      toast.success('Withdrawal request submitted!');
      setAmount('');
      setUpiId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit withdrawal');
    }
  };

  const upiString = upiId
    ? generateUPIString(upiId, parseFloat(amount) || 0)
    : '';

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
            <form onSubmit={handleAddMoney} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Amount (Points)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="100"
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <PaymentProofUpload
                onUploadSuccess={(url) => setProofUrl(url)}
                onUploadError={() => setProofUrl('')}
              />
              <button
                type="submit"
                className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-80 transition"
              >
                Submit Payment Request
              </button>
            </form>
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
              Minimum withdrawal: {MIN_WITHDRAW} points
            </p>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Amount (Points)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ${MIN_WITHDRAW} points`}
                  min={MIN_WITHDRAW}
                  max={points}
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@paytm"
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  required
                />
              </div>
              {upiString && (
                <div className="p-4 bg-bg rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">UPI Payment String:</p>
                  <p className="text-sm break-all">{upiString}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={points < MIN_WITHDRAW}
                className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request Withdrawal
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
                {payments.docs.map((doc: any) => {
                  const data = doc.data();
                  const payment = {
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

                  return (
                    <div
                      key={doc.id}
                      className="bg-bg border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-heading text-primary">
                            {payment.amount} points
                          </p>
                          <p className="text-sm text-gray-400">
                            {payment.created_at.toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            payment.status === 'approved'
                              ? 'bg-orange-900 text-orange-300'
                              : payment.status === 'rejected'
                              ? 'bg-orange-950 text-orange-400'
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


