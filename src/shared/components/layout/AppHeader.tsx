import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiDownload } from 'react-icons/hi';
import { TbBrandAndroid } from 'react-icons/tb';
import { GiTwoCoins } from 'react-icons/gi';
import { ROUTES } from '../../../utils/constants';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { useAuth } from '../../../contexts/AuthContext';

// Default fallback URL if settings are not configured
const DEFAULT_APK_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1sWCpFTUsfhjBJnOPigZ4KbPWL8u2fKPH';

/**
 * Handles APK download
 * Uses URL from settings if available, otherwise falls back to default
 */
const handleDownloadAPK = (url: string) => {
  // Open download link in a new tab
  // Users may need to click "Download anyway" if Google shows a warning
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const AppHeader: React.FC = () => {
  const { apkDownloadUrl, loading } = useAppSettings();
  const { user } = useAuth();

  // Use URL from settings if available, otherwise fall back to default
  const downloadUrl = apkDownloadUrl || DEFAULT_APK_DOWNLOAD_URL;

  return (
    <header className="fixed top-0 left-0 right-0 bg-bg-secondary border-b border-gray-800 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* App Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <img
                src="/applogo.png"
                alt="BattleManager Logo"
                className="w-10 h-10 rounded-lg object-contain"
              />
              {/* Full text on larger screens */}
              <span className="hidden md:block text-xl font-heading font-bold text-primary text-glow">
                BattleManager
              </span>
              {/* Truncated text on medium screens */}
              <span className="hidden sm:block md:hidden text-xl font-heading font-bold text-primary text-glow">
                BattleMana...
              </span>
              {/* Hidden on small screens - only logo shows */}
            </motion.div>
          </Link>

          {/* Total Points Display */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex items-center gap-2"
            >
              <span className="text-sm font-heading font-bold text-primary text-glow">Total Points</span>
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut"
                }}
                className="flex items-center justify-center filter drop-shadow-[0_0_8px_#FFBA00]"
              >
                <GiTwoCoins className="w-6 h-6 text-primary" />
              </motion.div>
              <span className="text-lg font-heading font-bold text-primary text-glow">
                {user.points.toLocaleString()}
              </span>
            </motion.div>
          )}

          {/* Download Android App Button */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            onClick={() => handleDownloadAPK(downloadUrl)}
            disabled={loading}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Download Android App"
          >
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut"
              }}
              className="flex items-center justify-center"
            >
              <TbBrandAndroid className="w-6 h-6 text-yellow-400" />
            </motion.div>
            <motion.div
              animate={{
                y: [0, -3, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 2,
                ease: "easeInOut"
              }}
              className="flex items-center justify-center"
            >
              <HiDownload className="w-5 h-5 text-yellow-400" />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </header>
  );
};

