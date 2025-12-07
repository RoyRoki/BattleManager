import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiExclamationCircle } from 'react-icons/hi';

/**
 * OfflineBanner component that displays when the user is offline
 * Uses navigator.onLine API and online/offline events for detection
 */
export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    // Set initial state
    setIsOffline(!navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600/90 backdrop-blur-sm border-b border-red-500 shadow-lg"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-3 text-white">
            <HiExclamationCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium font-heading">
              No Internet Connection
            </span>
            <span className="text-xs opacity-75 hidden sm:inline">
              Please check your network settings
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

