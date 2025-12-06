import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { useSupportChat } from '../../hooks/useSupportChat';
import { SupportChatInterface } from '../../components/support-chat-interface';
import { useFirestoreTransaction } from '../../hooks/useFirestoreTransaction';
import { Payment } from '../../types';
import toast from 'react-hot-toast';
import { HiChat, HiUser, HiClock } from 'react-icons/hi';

type NotificationTab = 'payments' | 'withdrawals' | 'support';

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const AdminNotifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('payments');
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const { addPoints } = useFirestoreTransaction();

  // Fetch all payments
  const [payments, loading, error] = useCollection(
    query(
      collection(firestore, 'payments'),
      orderBy('created_at', 'desc')
    )
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];
  
  // Log errors for debugging
  if (error) {
    console.error('AdminNotifications: Firestore error:', error);
  }

  // Support chat hook for admin
  const { supportChats, isLoadingChats } = useSupportChat();

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

  const tabs: { id: NotificationTab; label: string }[] = [
    { id: 'payments', label: 'Payments' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'support', label: 'Support Tickets' },
  ];

  return (
    <div className="min-h-screen bg-bg text-white pb-20">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-heading text-primary mb-2">Notifications</h1>
          <p className="text-gray-400">Real-time dashboard for pending actions</p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="bg-accent bg-opacity-20 border border-accent rounded-lg p-4 mb-6">
            <p className="text-accent font-body">
              ⚠️ Unable to load notification data. Please check your connection and refresh the page.
            </p>
            <p className="text-xs text-gray-400 mt-2">Error: {error.message || 'Unknown error'}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-heading transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {activeTab === 'payments' && (
            <div>
              <h2 className="text-xl font-heading text-primary mb-4">
                Pending Payments ({pendingAddMoney.length})
              </h2>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : pendingAddMoney.length === 0 ? (
                <div className="bg-bg-secondary border border-gray-800 rounded-lg p-8 text-center">
                  <p className="text-gray-400">No pending payments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAddMoney.map((payment) => (
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
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div>
              <h2 className="text-xl font-heading text-primary mb-4">
                Pending Withdrawals ({pendingWithdrawals.length})
              </h2>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : pendingWithdrawals.length === 0 ? (
                <div className="bg-bg-secondary border border-gray-800 rounded-lg p-8 text-center">
                  <p className="text-gray-400">No pending withdrawals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingWithdrawals.map((payment) => (
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
                            User: {payment.user_name || 'Unknown'} ({payment.user_mobile})
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
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h2 className="text-xl font-heading text-primary mb-4">
                  Support Chats ({supportChats.length})
                </h2>
                {isLoadingChats ? (
                  <div className="bg-bg-secondary border border-gray-800 rounded-lg p-8 text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-400">Loading support chats...</p>
                  </div>
                ) : supportChats.length === 0 ? (
                  <div className="bg-bg-secondary border border-gray-800 rounded-lg p-8 text-center">
                    <HiChat className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No support chats yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Users can chat with you from the Support page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supportChats.map((chat, index) => (
                      <motion.div
                        key={chat.user_mobile}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedChatUser(chat.user_mobile)}
                        className="bg-bg-secondary border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-primary transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-bg font-heading font-bold">
                              {chat.user_name?.[0]?.toUpperCase() || <HiUser className="w-6 h-6" />}
                            </div>
                            {(chat.unread_count ?? 0) > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-xs text-white font-bold">
                                {(chat.unread_count ?? 0) > 9 ? '9+' : (chat.unread_count ?? 0)}
                              </div>
                            )}
                          </div>

                          {/* Chat Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-white font-heading group-hover:text-primary transition truncate">
                                {chat.user_name || chat.user_mobile}
                              </h3>
                              {chat.last_message_time && (
                                <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0 ml-2">
                                  <HiClock className="w-3 h-3" />
                                  {formatTimeAgo(chat.last_message_time)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 truncate">
                              {chat.last_message || 'No messages'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {chat.user_mobile}
                            </p>
                          </div>

                          {/* Arrow */}
                          <div className="text-gray-600 group-hover:text-primary transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {selectedChatUser && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-bg-secondary border border-gray-800 rounded-lg h-[calc(100vh-400px)] min-h-[500px] overflow-hidden"
                >
                  <SupportChatInterface
                    targetUserMobile={selectedChatUser}
                    onBack={() => setSelectedChatUser(null)}
                    showHeader={true}
                  />
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
