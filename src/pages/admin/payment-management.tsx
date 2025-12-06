import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { useFirestoreTransaction } from '../../hooks/useFirestoreTransaction';
import { Payment } from '../../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const PaymentManagement: React.FC = () => {
  const [payments, loading] = useCollection(
    collection(firestore, 'payments')
  ) as unknown as [{ docs: any[] } | null, boolean];
  const { addPoints } = useFirestoreTransaction();

  const handleApprove = async (payment: Payment) => {
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

  const handleReject = async (payment: Payment) => {
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

  const pendingPayments =
    payments?.docs.filter((doc) => doc.data().status === 'pending') || [];
  const allPayments = payments?.docs || [];

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-heading text-primary mb-6 text-glow">
          Payment Management
        </h1>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-heading text-accent mb-4">
                Pending Payments ({pendingPayments.length})
              </h2>
              <div className="space-y-4">
                {pendingPayments.length > 0 ? (
                  pendingPayments.map((doc: any) => {
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
                    } as Payment;

                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-bg-secondary border border-accent rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-lg font-heading text-primary">
                              {payment.amount} points
                            </p>
                            <p className="text-sm text-gray-400">User: {payment.user_mobile}</p>
                            <p className="text-xs text-gray-500">
                              {payment.created_at.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(payment)}
                              className="bg-primary text-bg px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(payment)}
                              className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
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
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-center py-8">No pending payments</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-heading text-primary mb-4">All Payments</h2>
              <div className="space-y-2">
                {allPayments.map((doc: any) => {
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
                  } as Payment;

                  return (
                    <div
                      key={doc.id}
                      className="bg-bg-secondary border border-gray-800 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-primary">{payment.amount} points</p>
                          <p className="text-xs text-gray-400">{payment.user_mobile}</p>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};


