import { runTransaction } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

/**
 * Hook for Firestore transactions
 * Used for atomic operations like points deduction during enrollment
 */
export const useFirestoreTransaction = () => {
  const executeTransaction = async <T>(
    transactionFn: (transaction: any) => Promise<T>
  ): Promise<T | null> => {
    try {
      const result = await runTransaction(firestore, async (transaction) => {
        return await transactionFn(transaction);
      });
      return result;
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error(error.message || 'Transaction failed');
      return null;
    }
  };

  const deductPoints = async (
    userEmail: string,
    amount: number
  ): Promise<boolean> => {
    if (!userEmail) {
      throw new Error('User email is required');
    }
    
    // Normalize email (lowercase, trim) for Firestore lookup
    const normalizedEmail = userEmail.toLowerCase().trim();
    
    return (
      (await executeTransaction(async (transaction) => {
        const userRef = doc(firestore, 'users', normalizedEmail);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const currentPoints = userDoc.data().points || 0;
        if (currentPoints < amount) {
          throw new Error('Insufficient points');
        }

        transaction.update(userRef, {
          points: currentPoints - amount,
          updated_at: new Date(),
        });

        return true;
      })) !== null
    );
  };

  const addPoints = async (
    userEmail: string,
    amount: number
  ): Promise<boolean> => {
    if (!userEmail) {
      throw new Error('User email is required');
    }
    
    // Normalize email (lowercase, trim) for Firestore lookup
    const normalizedEmail = userEmail.toLowerCase().trim();
    
    return (
      (await executeTransaction(async (transaction) => {
        const userRef = doc(firestore, 'users', normalizedEmail);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const currentPoints = userDoc.data().points || 0;
        transaction.update(userRef, {
          points: currentPoints + amount,
          updated_at: new Date(),
        });

        return true;
      })) !== null
    );
  };

  return {
    executeTransaction,
    deductPoints,
    addPoints,
  };
};


