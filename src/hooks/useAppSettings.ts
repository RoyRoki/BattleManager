import { useDocument } from 'react-firebase-hooks/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { DEFAULT_WITHDRAWAL_COMMISSION } from '../utils/constants';
import toast from 'react-hot-toast';

export interface AppSettings {
  withdrawalCommission: number;
  updated_at?: Date;
}

const SETTINGS_DOC_ID = 'withdrawal';

/**
 * Hook to fetch and update app settings from Firestore
 * Settings are stored in 'settings' collection with document ID 'withdrawal'
 */
export const useAppSettings = () => {
  const [settingsDoc, loading, error] = useDocument(
    doc(firestore, 'settings', SETTINGS_DOC_ID)
  ) as unknown as [
    { data: () => AppSettings | undefined; exists: boolean } | null,
    boolean,
    Error | undefined
  ];

  const settings: AppSettings = settingsDoc?.data() || {
    withdrawalCommission: DEFAULT_WITHDRAWAL_COMMISSION,
  };

  const updateWithdrawalCommission = async (commission: number) => {
    if (commission < 0 || commission > 100) {
      toast.error('Commission must be between 0 and 100');
      return false;
    }

    try {
      await setDoc(
        doc(firestore, 'settings', SETTINGS_DOC_ID),
        {
          withdrawalCommission: commission,
          updated_at: new Date(),
        },
        { merge: true }
      );
      toast.success('Commission rate updated successfully');
      return true;
    } catch (err: any) {
      console.error('Error updating commission:', err);
      toast.error('Failed to update commission rate');
      return false;
    }
  };

  return {
    settings,
    withdrawalCommission: settings.withdrawalCommission,
    loading,
    error,
    updateWithdrawalCommission,
  };
};


