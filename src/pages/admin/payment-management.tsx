import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { useFirestoreTransaction } from '../../hooks/useFirestoreTransaction';
import { Payment } from '../../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const PaymentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add_money' | 'withdrawal'>('add_money');
  const [payments, loading] = useCollection(
    collection(firestore, 'payments')
  ) as unknown as [{ docs: any[] } | null, boolean];
  const { addPoints } = useFirestoreTransaction();

  // Separate payments by type
  const { addMoneyPayments, withdrawalPayments } = useMemo(() => {
    if (!payments?.docs) return { addMoneyPayments: [], withdrawalPayments: [] };

    const addMoney: Payment[] = [];
    const withdrawals: Payment[] = [];

    payments.docs.forEach((doc: any) => {
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

      if (payment.type === 'withdrawal') {
        withdrawals.push(payment);
      } else {
        addMoney.push(payment);
      }
    });

    return { addMoneyPayments: addMoney, withdrawalPayments: withdrawals };
  }, [payments]);

  const pendingAddMoney = addMoneyPayments.filter((p) => p.status === 'pending');
  const pendingWithdrawals = withdrawalPayments.filter((p) => p.status === 'pending');

  const handleApproveAddMoney = async (payment: Payment) => {
    try {
      await updateDoc(doc(firestore, 'payments', payment.id), {
        status: 'approved',
        approved_by: import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com',
        approved_at: new Date(),
        updated_at: new Date(),
      });

      // Credit points to user
      await addPoints(payment.user_mobile, payment.amount);

      toast.success('Payment approved and points credited!');
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    }
  };

  const handleRejectAddMoney = async (payment: Payment) => {
    if (!confirm('Are you sure you want to reject this payment?')) return;

    try {
      await updateDoc(doc(firestore, 'payments', payment.id), {
        status: 'rejected',
        approved_by: import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com',
        approved_at: new Date(),
        updated_at: new Date(),
      });

      toast.success('Payment rejected');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const handleCompleteWithdrawal = async (payment: Payment) => {
    if (!confirm('Mark this withdrawal as completed? The amount has been transferred to the user.')) return;

    try {
      await updateDoc(doc(firestore, 'payments', payment.id), {
        status: 'approved',
        approved_by: import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com',
        approved_at: new Date(),
        updated_at: new Date(),
      });

      toast.success('Withdrawal marked as completed');
    } catch (error) {
      console.error('Error completing withdrawal:', error);
      toast.error('Failed to mark withdrawal as completed');
    }
  };

  const handleRejectWithdrawal = async (payment: Payment) => {
    if (!confirm('Reject this withdrawal and refund points to user?')) return;

    try {
      // Refund points back to user
      await addPoints(payment.user_mobile, payment.amount);

      await updateDoc(doc(firestore, 'payments', payment.id), {
        status: 'rejected',
        approved_by: import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com',
        approved_at: new Date(),
        updated_at: new Date(),
        notes: 'Withdrawal rejected - points refunded',
      });

      toast.success('Withdrawal rejected and points refunded');
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error('Failed to reject withdrawal');
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-heading text-primary mb-6 text-glow">
          Payment Management
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('add_money')}
            className={`flex-1 py-2 rounded-lg font-heading transition ${
              activeTab === 'add_money'
                ? 'bg-primary text-bg'
                : 'bg-bg-secondary text-gray-400 hover:text-white'
            }`}
          >
            Add Money ({pendingAddMoney.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawal')}
            className={`flex-1 py-2 rounded-lg font-heading transition ${
              activeTab === 'withdrawal'
                ? 'bg-primary text-bg'
                : 'bg-bg-secondary text-gray-400 hover:text-white'
            }`}
          >
            Withdrawals ({pendingWithdrawals.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <>
            {activeTab === 'add_money' && (
              <div>
                <h2 className="text-xl font-heading text-accent mb-4">
                  Pending Add Money Requests ({pendingAddMoney.length})
                </h2>
                <div className="space-y-4">
                  {pendingAddMoney.length > 0 ? (
                    pendingAddMoney.map((payment) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-bg-secondary border border-accent rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-lg font-heading text-primary">
                              {payment.amount} points
                            </p>
                            <p className="text-sm text-gray-400">
                              User: {payment.user_name || 'Unknown'} ({payment.user_mobile})
                            </p>
                            <p className="text-xs text-gray-500">
                              {payment.created_at.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveAddMoney(payment)}
                              className="bg-primary text-bg px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectAddMoney(payment)}
                              className="bg-accent text-bg px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                        {payment.proof_url && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-400 mb-2">Payment Proof:</p>
                            <a
                              href={payment.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Image
                            </a>
                          </div>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-8">No pending add money requests</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'withdrawal' && (
              <div>
                <h2 className="text-xl font-heading text-accent mb-4">
                  Pending Withdrawal Requests ({pendingWithdrawals.length})
                </h2>
                <div className="space-y-4">
                  {pendingWithdrawals.length > 0 ? (
                    pendingWithdrawals.map((payment) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-bg-secondary border border-accent rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <p className="text-lg font-heading text-primary">
                              {payment.amount} points
                            </p>
                            <p className="text-sm text-gray-400">
                              User: {payment.user_name || payment.user_mobile} ({payment.user_mobile})
                            </p>
                            {payment.commission_amount && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-500">
                                  Commission: <span className="text-red-400">{payment.commission_amount.toFixed(2)} pts</span>
                                </p>
                                <p className="text-xs text-gray-500">
                                  Final Amount: <span className="text-primary">{payment.final_amount?.toFixed(2)} pts</span>
                                </p>
                              </div>
                            )}
                            <div className="mt-3 p-3 bg-bg rounded-lg border border-gray-700">
                              <p className="text-xs text-gray-500 mb-1">Bank Details:</p>
                              <p className="text-sm text-white">
                                Account: {payment.bank_account_no ? `****${payment.bank_account_no.slice(-4)}` : 'N/A'}
                              </p>
                              <p className="text-sm text-white">
                                IFSC: {payment.ifsc_code || 'N/A'}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {payment.created_at.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleCompleteWithdrawal(payment)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition whitespace-nowrap"
                            >
                              Mark Completed
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(payment)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition whitespace-nowrap"
                            >
                              Reject & Refund
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-8">No pending withdrawal requests</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
