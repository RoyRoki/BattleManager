import { useDocument } from 'react-firebase-hooks/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { DEFAULT_WITHDRAWAL_COMMISSION } from '../utils/constants';
import toast from 'react-hot-toast';

export interface AppSettings {
  withdrawalCommission: number;
  upiId?: string;
  upiName?: string;
  apkDownloadUrl?: string;
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
    upiId: undefined,
    upiName: undefined,
    apkDownloadUrl: undefined,
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

  const updateUPISettings = async (upiId: string, upiName: string) => {
    if (!upiId.trim()) {
      toast.error('UPI ID is required');
      return false;
    }
    if (!upiName.trim()) {
      toast.error('UPI Name is required');
      return false;
    }

    try {
      await setDoc(
        doc(firestore, 'settings', SETTINGS_DOC_ID),
        {
          upiId: upiId.trim(),
          upiName: upiName.trim(),
          updated_at: new Date(),
        },
        { merge: true }
      );
      toast.success('UPI settings updated successfully');
      return true;
    } catch (err: any) {
      console.error('Error updating UPI settings:', err);
      toast.error('Failed to update UPI settings');
      return false;
    }
  };

  const updateAPKDownloadUrl = async (url: string) => {
    if (!url.trim()) {
      toast.error('APK Download URL is required');
      return false;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      toast.error('Please enter a valid URL');
      return false;
    }

    try {
      await setDoc(
        doc(firestore, 'settings', SETTINGS_DOC_ID),
        {
          apkDownloadUrl: url.trim(),
          updated_at: new Date(),
        },
        { merge: true }
      );
      toast.success('APK Download URL updated successfully');
      return true;
    } catch (err: any) {
      console.error('Error updating APK Download URL:', err);
      toast.error('Failed to update APK Download URL');
      return false;
    }
  };

  return {
    settings,
    withdrawalCommission: settings.withdrawalCommission,
    upiId: settings.upiId,
    upiName: settings.upiName,
    apkDownloadUrl: settings.apkDownloadUrl,
    loading,
    error,
    updateWithdrawalCommission,
    updateUPISettings,
    updateAPKDownloadUrl,
  };
};


