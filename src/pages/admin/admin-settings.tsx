import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BannerManagement } from '../../components/admin/banner-management';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';

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

export const AdminSettings: React.FC = () => {
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
            description="Configure commission rates for tournaments"
            delay={0.2}
          >
            <p className="text-sm text-gray-500">Feature coming soon...</p>
          </SettingsSection>

          <SettingsSection
            title="Withdrawal Settings"
            description="Set minimum withdrawal amounts"
            delay={0.2}
          >
            <p className="text-sm text-gray-500">Feature coming soon...</p>
          </SettingsSection>

          <SettingsSection
            title="Site Banners"
            description="Upload and manage site banners"
            delay={0.3}
          >
            <p className="text-sm text-gray-500">Feature coming soon...</p>
          </SettingsSection>

          <SettingsSection
            title="Default Settings"
            description="Configure default tournament settings (e.g., maximum players)"
            delay={0.4}
          >
            <p className="text-sm text-gray-500">Feature coming soon...</p>
          </SettingsSection>

          <SettingsSection
            title="Chat Moderation"
            description="Moderation tools for global chat"
            delay={0.5}
          >
            <p className="text-sm text-gray-500">Feature coming soon...</p>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};

