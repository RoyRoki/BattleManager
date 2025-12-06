import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiBell } from 'react-icons/hi';
import { ROUTES } from '../../../utils/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationViewModel } from '../../../features/notifications';

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount, error } = useNotificationViewModel(user?.mobile_no || null);
  const isNotificationPage = location.pathname === ROUTES.NOTIFICATIONS;

  // Log error but don't break the UI
  if (error) {
    console.warn('Notification loading error in header:', error);
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-bg-secondary border-b border-gray-800 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* App Logo */}
          <Link to={ROUTES.HOME} className="flex items-center space-x-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-bg font-heading font-bold text-lg">BM</span>
              </div>
              <span className="text-xl font-heading font-bold text-primary text-glow">
                BattleManager
              </span>
            </motion.div>
          </Link>

          {/* Notification Icon */}
          {user && (
            <Link
              to={ROUTES.NOTIFICATIONS}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-bg-tertiary transition-colors"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <HiBell
                  className={`text-2xl ${
                    isNotificationPage ? 'text-primary' : 'text-gray-400'
                  }`}
                />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center border-2 border-bg-secondary"
                  >
                    <span className="text-xs font-bold text-bg">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

