import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { User } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { HiSearch, HiX } from 'react-icons/hi';
import { useFirestoreTransaction } from '../../hooks/useFirestoreTransaction';
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

export const UserManagement: React.FC = () => {
  const [users, loading, error] = useCollection(
    collection(firestore, 'users')
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];
  const [searchQuery, setSearchQuery] = useState('');
  const { addPoints, deductPoints } = useFirestoreTransaction();
  
  // Amount input modal state
  const [amountModal, setAmountModal] = useState<{
    isOpen: boolean;
    user: User | null;
    actionType: 'credit' | 'debit' | null;
    amount: string;
    error: string;
  }>({
    isOpen: false,
    user: null,
    actionType: null,
    amount: '',
    error: '',
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger' | 'success';
    onConfirm: () => void;
    userEmail: string;
    amount: number;
    actionType: 'credit' | 'debit';
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  
  // Log errors for debugging
  if (error) {
    console.error('UserManagement: Firestore error:', error);
  }

  // Filter users based on search query (name and FF ID)
  const filteredUsers = useMemo(() => {
    if (!users?.docs) return [];
    
    if (!searchQuery.trim()) {
      return users.docs;
    }

    const query = searchQuery.toLowerCase().trim();
    return users.docs.filter((doc: any) => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const ffId = (data.ff_id || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      
      return name.includes(query) || ffId.includes(query) || email.includes(query);
    });
  }, [users, searchQuery]);

  // Handler for credit button click
  const handleCreditClick = (user: User) => {
    setAmountModal({
      isOpen: true,
      user,
      actionType: 'credit',
      amount: '',
      error: '',
    });
  };

  // Handler for debit button click
  const handleDebitClick = (user: User) => {
    setAmountModal({
      isOpen: true,
      user,
      actionType: 'debit',
      amount: '',
      error: '',
    });
  };

  // Handler for amount input change
  const handleAmountChange = (value: string) => {
    // Only allow numeric values
    const numericValue = value.replace(/\D/g, '');
    setAmountModal((prev) => ({
      ...prev,
      amount: numericValue,
      error: '',
    }));
  };

  // Handler for amount submit
  const handleAmountSubmit = () => {
    const amount = parseInt(amountModal.amount, 10);

    // Validation
    if (!amountModal.amount.trim()) {
      setAmountModal((prev) => ({
        ...prev,
        error: 'Please enter an amount',
      }));
      return;
    }

    if (isNaN(amount) || amount < 1) {
      setAmountModal((prev) => ({
        ...prev,
        error: 'Amount must be a positive number (minimum 1)',
      }));
      return;
    }

    if (!amountModal.user) {
      toast.error('User not found');
      return;
    }

    // For debit, check if user has sufficient points
    if (amountModal.actionType === 'debit' && amountModal.user.points < amount) {
      setAmountModal((prev) => ({
        ...prev,
        error: `Insufficient points. User has ${amountModal.user?.points || 0} points.`,
      }));
      return;
    }

    // Store user info before closing modal
    const user = amountModal.user;
    const currentPoints = user.points;
    const newPoints = amountModal.actionType === 'credit' 
      ? currentPoints + amount 
      : currentPoints - amount;

    const actionText = amountModal.actionType === 'credit' ? 'credit' : 'debit';
    const actionTitle = amountModal.actionType === 'credit' ? 'Credit Points' : 'Debit Points';

    // Store user email, amount, and action type for confirmation
    const userEmail = user.email;
    const actionType = amountModal.actionType;

    // Close amount modal and show confirmation dialog
    setAmountModal({
      isOpen: false,
      user: null,
      actionType: null,
      amount: '',
      error: '',
    });

    if (actionType) {
      setConfirmDialog({
        isOpen: true,
        title: actionTitle,
        message: `Are you sure you want to ${actionText} ${amount} points to ${user.name || user.email}?\n\nCurrent Points: ${currentPoints}\nAmount: ${amount}\nNew Balance: ${newPoints}`,
        confirmText: actionType === 'credit' ? 'Credit' : 'Debit',
        cancelText: 'Cancel',
        confirmVariant: actionType === 'credit' ? 'success' : 'danger',
        userEmail,
        amount,
        actionType,
        onConfirm: () => {
          setConfirmDialog(null);
          if (actionType === 'credit') {
            handleConfirmCredit(userEmail, amount);
          } else {
            handleConfirmDebit(userEmail, amount);
          }
        },
      });
    }
  };

  // Handler for confirm credit
  const handleConfirmCredit = async (userEmail: string, amount: number) => {
    setIsProcessing(true);
    try {
      const success = await addPoints(userEmail, amount);
      if (success) {
        toast.success(`Successfully credited ${amount} points`);
      } else {
        toast.error('Failed to credit points');
      }
    } catch (error: any) {
      console.error('Error crediting points:', error);
      toast.error(error.message || 'Failed to credit points');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for confirm debit
  const handleConfirmDebit = async (userEmail: string, amount: number) => {
    setIsProcessing(true);
    try {
      const success = await deductPoints(userEmail, amount);
      if (success) {
        toast.success(`Successfully debited ${amount} points`);
      } else {
        toast.error('Failed to debit points');
      }
    } catch (error: any) {
      console.error('Error debiting points:', error);
      const errorMessage = error.message || 'Failed to debit points';
      if (errorMessage.includes('Insufficient points')) {
        toast.error('User has insufficient points');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler to close amount modal
  const handleCloseAmountModal = () => {
    setAmountModal({
      isOpen: false,
      user: null,
      actionType: null,
      amount: '',
      error: '',
    });
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-heading text-primary mb-6 text-glow">User Management</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or FF ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-accent bg-opacity-20 border border-accent rounded-lg p-4 mb-6">
            <p className="text-accent font-body">
              ⚠️ Unable to load user data. Please check your connection and refresh the page.
            </p>
            <p className="text-xs text-gray-400 mt-2">Error: {error.message || 'Unknown error'}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {searchQuery.trim() ? 'No users found matching your search.' : 'No users found.'}
                </p>
              </div>
            ) : (
              filteredUsers.map((doc: any) => {
              const data = doc.data();
              const user = {
                ...data,
                created_at:
                  data.created_at instanceof Date
                    ? data.created_at
                    : (data.created_at as any)?.toDate?.() || new Date(),
                updated_at:
                  data.updated_at instanceof Date
                    ? data.updated_at
                    : (data.updated_at as any)?.toDate?.() || new Date(),
              } as User;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-heading text-primary">
                        {user.name || 'No Name'}
                      </h3>
                      <p className="text-sm text-gray-400">Email: {user.email}</p>
                      {(user as any).ff_id && (
                        <p className="text-sm text-gray-400">FF ID: {(user as any).ff_id}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-400">Points: {user.points}</span>
                        <span className="text-gray-400">
                          Tournaments: {user.enrolled_tournaments.length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined: {user.created_at.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          user.is_active
                            ? 'bg-orange-900 text-orange-300'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreditClick(user)}
                          disabled={isProcessing}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-heading"
                        >
                          Credit
                        </button>
                        <button
                          onClick={() => handleDebitClick(user)}
                          disabled={isProcessing}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-heading"
                        >
                          Debit
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
              })
            )}
          </div>
        )}
      </div>

      {/* Amount Input Modal */}
      <AnimatePresence>
        {amountModal.isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseAmountModal}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            >
              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-bg-secondary border border-primary/30 rounded-lg p-6 max-w-md w-full"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-heading text-primary">
                    {amountModal.actionType === 'credit' ? 'Credit Points' : 'Debit Points'}
                  </h3>
                  <button
                    onClick={handleCloseAmountModal}
                    className="text-gray-400 hover:text-primary transition"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>

                {/* User Info */}
                {amountModal.user && (
                  <div className="mb-4 p-3 bg-bg rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400">User:</p>
                    <p className="text-white font-heading">{amountModal.user.name || amountModal.user.email}</p>
                    <p className="text-sm text-gray-400 mt-1">Current Points: {amountModal.user.points}</p>
                  </div>
                )}

                {/* Amount Input */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    Enter Amount
                  </label>
                  <input
                    type="text"
                    value={amountModal.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-lg"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAmountSubmit();
                      }
                    }}
                  />
                  {amountModal.error && (
                    <p className="text-sm text-red-400 mt-2">{amountModal.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseAmountModal}
                    className="flex-1 bg-bg border border-gray-700 text-gray-300 py-2 rounded-lg hover:bg-bg-tertiary transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAmountSubmit}
                    disabled={!amountModal.amount.trim() || isProcessing}
                    className={`flex-1 py-2 rounded-lg font-heading transition ${
                      amountModal.actionType === 'credit'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

