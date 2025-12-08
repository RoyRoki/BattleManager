import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { useFirestoreTransaction } from '../../hooks/useFirestoreTransaction';
import { Payment } from '../../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog';

export const PaymentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add_money' | 'withdrawal'>('add_money');
  const [payments, loading, error] = useCollection(
    collection(firestore, 'payments')
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];
  
  // Log errors for debugging
  if (error) {
    console.error('PaymentManagement: Firestore error:', error);
  }
  const { addPoints } = useFirestoreTransaction();
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger' | 'success';
    onConfirm: () => void;
  } | null>(null);

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
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to approve this payment of ${payment.amount} points? Points will be credited to the user.`,
      title: 'Approve Payment',
      confirmText: 'Approve',
      cancelText: 'Cancel',
      confirmVariant: 'success',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await updateDoc(doc(firestore, 'payments', payment.id), {
            status: 'approved',
            approved_by: import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com',
            approved_at: new Date(),
            updated_at: new Date(),
          });

          // Credit points to user
          await addPoints(payment.user_email, payment.amount);

          toast.success('Payment approved and points credited!');
        } catch (error) {
          console.error('Error approving payment:', error);
          toast.error('Failed to approve payment');
        }
      },
    });
  };

  const handleRejectAddMoney = async (payment: Payment) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to reject this payment?',
      title: 'Reject Payment',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
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
      },
    });
  };

  const handleCompleteWithdrawal = async (payment: Payment) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Mark this withdrawal as completed? The amount has been transferred to the user.',
      title: 'Complete Withdrawal',
      confirmText: 'Mark Completed',
      cancelText: 'Cancel',
      confirmVariant: 'success',
      onConfirm: async () => {
        setConfirmDialog(null);
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
      },
    });
  };

  const handleRejectWithdrawal = async (payment: Payment) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Reject this withdrawal and refund points to user?',
      title: 'Reject Withdrawal',
      confirmText: 'Reject & Refund',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          // Refund points back to user
          await addPoints(payment.user_email, payment.amount);

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
      },
    });
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

        {/* Error Message */}
        {error && (
          <div className="bg-accent bg-opacity-20 border border-accent rounded-lg p-4 mb-6">
            <p className="text-accent font-body">
              ⚠️ Unable to load payment data. Please check your connection and refresh the page.
            </p>
            <p className="text-xs text-gray-400 mt-2">Error: {error.message || 'Unknown error'}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading payments...</p>
          </div>
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
                              User: {payment.user_name || 'Unknown'} ({payment.user_email})
                            </p>
                            {payment.transaction_id && (
                              <div className="mt-2 p-2 bg-cyan-900/20 border border-cyan-600/50 rounded-lg">
                                <p className="text-xs text-cyan-400 mb-1">Manual Payment - Transaction ID:</p>
                                <p className="text-sm text-cyan-300 font-mono break-all">{payment.transaction_id}</p>
                              </div>
                            )}
                            {payment.notes && (
                              <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                                <p className="text-sm text-yellow-300 font-heading">{payment.notes}</p>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
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
                              User: {payment.user_name || payment.user_email} ({payment.user_email})
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
                                Account: {payment.bank_account_no || 'N/A'}
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

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmVariant={confirmDialog.confirmVariant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
