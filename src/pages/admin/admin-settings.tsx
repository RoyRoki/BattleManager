import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BannerManagement } from '../../components/admin/banner-management';
import { HiChevronDown, HiLogout } from 'react-icons/hi';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../utils/constants';
import toast from 'react-hot-toast';
import { QRCodeUpload } from '../../components/qr-code-upload';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  delay?: number;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  defaultExpanded = false,
  delay = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-bg-secondary border border-gray-800 rounded-lg overflow-hidden"
    >
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex-1 text-left">
          <h2 className="text-xl font-heading text-primary mb-1">{title}</h2>
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-4 text-primary"
        >
          <HiChevronDown className="w-6 h-6" />
        </motion.div>
      </button>

      {/* Content - Animated expand/collapse */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-4 border-t border-gray-800">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CommissionSettings: React.FC = () => {
  const { withdrawalCommission, loading, updateWithdrawalCommission } = useAppSettings();
  const [commission, setCommission] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (withdrawalCommission !== undefined) {
      setCommission(withdrawalCommission.toString());
    }
  }, [withdrawalCommission]);

  const handleSave = async () => {
    const commissionNum = parseFloat(commission);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      toast.error('Please enter a valid commission percentage (0-100)');
      return;
    }

    setIsSaving(true);
    const success = await updateWithdrawalCommission(commissionNum);
    setIsSaving(false);
    if (success) {
      setCommission(commissionNum.toString());
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Withdrawal Commission (%)
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            min="0"
            max="100"
            step="0.1"
            placeholder="Enter commission percentage"
            className="flex-1 bg-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving || commission === withdrawalCommission?.toString()}
            className="bg-primary text-bg px-6 py-2 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </motion.button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Current commission: {withdrawalCommission}% (This percentage will be deducted from withdrawal amounts)
        </p>
      </div>
    </div>
  );
};

const UPISettings: React.FC = () => {
  const { upiId, upiName, qrCodeUrl, loading, updateUPISettings, updateQRCodeUrl } = useAppSettings();
  const [upiIdValue, setUpiIdValue] = useState<string>('');
  const [upiNameValue, setUpiNameValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setUpiIdValue(upiId || '');
    setUpiNameValue(upiName || '');
  }, [upiId, upiName]);

  const handleSave = async () => {
    if (!upiIdValue.trim()) {
      toast.error('UPI ID is required');
      return;
    }
    if (!upiNameValue.trim()) {
      toast.error('UPI Name is required');
      return;
    }

    setIsSaving(true);
    const success = await updateUPISettings(
      upiIdValue.trim(),
      upiNameValue.trim()
    );
    setIsSaving(false);
    if (success) {
      setUpiIdValue(upiIdValue.trim());
      setUpiNameValue(upiNameValue.trim());
    }
  };

  const handleQRCodeUpload = async (url: string) => {
    await updateQRCodeUrl(url);
    // Error is already shown by updateQRCodeUrl if it fails
  };

  if (loading) {
    return <div className="text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* QR Code Upload Section */}
      <div>
        <h3 className="text-lg font-heading text-primary mb-4">QR Code for Payments</h3>
        <QRCodeUpload
          currentQRCodeUrl={qrCodeUrl}
          onUploadSuccess={handleQRCodeUpload}
          onUploadError={(error) => {
            console.error('QR Code upload error:', error);
          }}
        />
        {!qrCodeUrl && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mt-4">
            <p className="text-xs text-yellow-300">
              ⚠️ QR Code is not configured. Users will not be able to see the payment QR code until it is uploaded.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-lg font-heading text-primary mb-4">UPI Details (Optional)</h3>
        <p className="text-xs text-gray-400 mb-4">
          UPI ID and Name are optional and can be displayed in the payment interface for reference.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              UPI ID <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={upiIdValue}
              onChange={(e) => setUpiIdValue(e.target.value)}
              placeholder="e.g., 9800881300@upi"
              className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter your UPI ID (e.g., phone@upi, name@paytm)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              UPI Name / Merchant Name <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={upiNameValue}
              onChange={(e) => setUpiNameValue(e.target.value)}
              placeholder="e.g., RokiRoy"
              className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter the merchant name that appears in UPI payments
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving || (upiIdValue === upiId && upiNameValue === upiName)}
            className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save UPI Settings'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const APKDownloadSettings: React.FC = () => {
  const { apkDownloadUrl, loading, updateAPKDownloadUrl } = useAppSettings();
  const [urlValue, setUrlValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setUrlValue(apkDownloadUrl || '');
  }, [apkDownloadUrl]);

  const handleSave = async () => {
    if (!urlValue.trim()) {
      toast.error('APK Download URL is required');
      return;
    }

    setIsSaving(true);
    const success = await updateAPKDownloadUrl(urlValue.trim());
    setIsSaving(false);
    if (success) {
      setUrlValue(urlValue.trim());
    }
  };

  const handleTest = () => {
    if (urlValue.trim()) {
      window.open(urlValue.trim(), '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Please enter a URL first');
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          APK Download URL
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://drive.google.com/uc?export=download&id=..."
            className="flex-1 bg-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTest}
            disabled={!urlValue.trim()}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Test URL"
          >
            Test
          </motion.button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter the direct download URL for the Android APK file. This URL will be used in the download button in the app header.
        </p>
        {apkDownloadUrl && (
          <p className="text-xs text-primary mt-2">
            Current URL: {apkDownloadUrl}
          </p>
        )}
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={isSaving || urlValue === apkDownloadUrl}
        className="w-full bg-primary text-bg py-3 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save APK Download URL'}
      </motion.button>
      {!apkDownloadUrl && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
          <p className="text-xs text-yellow-300">
            ⚠️ APK Download URL is not configured. The download button will use a default URL.
          </p>
        </div>
      )}
    </div>
  );
};

export const AdminSettings: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success('Logged out successfully');
      navigate(ROUTES.ADMIN_LOGIN);
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white pb-20">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-heading text-primary mb-2">Settings</h1>
          <p className="text-gray-400">Configure global application settings</p>
        </motion.div>

        <div className="space-y-4">
          <SettingsSection
            title="Hero Banners"
            description="Upload and manage hero banners displayed on the home page"
            defaultExpanded={true}
            delay={0.1}
          >
            <BannerManagement />
          </SettingsSection>

          <SettingsSection
            title="Commission Rates"
            description="Configure withdrawal commission percentage"
            delay={0.2}
          >
            <CommissionSettings />
          </SettingsSection>

          <SettingsSection
            title="UPI Payment Settings"
            description="Configure UPI ID and merchant name for payments"
            delay={0.25}
          >
            <UPISettings />
          </SettingsSection>

          <SettingsSection
            title="APK Download Settings"
            description="Configure the Android APK download URL"
            delay={0.3}
          >
            <APKDownloadSettings />
          </SettingsSection>

          <SettingsSection
            title="Account"
            description="Manage your admin account"
            delay={0.35}
          >
            <div className="space-y-4">
              <div className="bg-bg border border-accent border-opacity-30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-4">
                  Sign out from your admin account. You will need to login again to access admin features.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full bg-accent text-white py-3 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <HiLogout className="w-5 h-5" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </motion.button>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};

