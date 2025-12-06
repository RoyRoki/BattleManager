import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { PAYMENT_STATUS } from '../../utils/constants';

type NotificationTab = 'payments' | 'withdrawals' | 'support';

export const AdminNotifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('payments');

  // Fetch pending payments
  const [pendingPayments] = useCollection(
    query(
      collection(firestore, 'payments'),
      where('status', '==', PAYMENT_STATUS.PENDING),
      orderBy('created_at', 'desc')
    )
  );

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
                Pending Payments ({pendingPayments?.docs.length || 0})
              </h2>
              {pendingPayments?.docs.length === 0 ? (
                <div className="bg-bg-secondary border border-gray-800 rounded-lg p-8 text-center">
                  <p className="text-gray-400">No pending payments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPayments?.docs.map((doc) => {
                    const payment = doc.data();
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-bg-secondary border border-gray-800 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-body">
                              {payment.user_mobile || payment.user_ff_id || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-400">
                              Amount: ₹{payment.amount} | {payment.payment_method}
                            </p>
                            {payment.proof_url && (
                              <a
                                href={payment.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                View Proof
                              </a>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button className="px-4 py-2 bg-primary text-bg rounded-lg hover:bg-primary/80 transition-colors">
                              Approve
                            </button>
                            <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors">
                              Reject
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div>
              <h2 className="text-xl font-heading text-primary mb-4">Pending Withdrawals</h2>
              <div className="bg-bg-secondary border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">No pending withdrawals</p>
                <p className="text-sm text-gray-500 mt-2">Withdrawal feature coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div>
              <h2 className="text-xl font-heading text-primary mb-4">Support Tickets</h2>
              <div className="bg-bg-secondary border border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">No support tickets</p>
                <p className="text-sm text-gray-500 mt-2">Support ticket system coming soon...</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

