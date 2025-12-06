import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiBell, HiCheckCircle, HiXCircle, HiInformationCircle, HiExclamation, HiArrowLeft } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationViewModel, Notification } from '../features/notifications';
import toast from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotificationViewModel(user?.mobile_no || null);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark all notifications as read');
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <HiCheckCircle className="text-primary" />;
      case 'error':
        return <HiXCircle className="text-accent" />;
      case 'info':
        return <HiInformationCircle className="text-primary" />;
      case 'warning':
        return <HiExclamation className="text-accent" />;
      default:
        return <HiBell className="text-gray-400" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-20">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Please login to view notifications</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-primary text-xl font-heading">Loading notifications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="text-accent text-xl font-heading mb-2">Error loading notifications</div>
          <p className="text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <HiArrowLeft className="text-xl text-primary" />
          </motion.button>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading text-primary text-glow flex-1"
          >
            Notifications
          </motion.h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-primary hover:text-accent transition-colors font-body flex-shrink-0"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
              className="relative mb-6"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border-2 border-primary/30">
                <HiBell className="w-12 h-12 text-primary" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full border-2 border-bg"
              />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-heading text-white mb-2 text-glow"
            >
              No notifications
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-base font-body max-w-sm text-center"
            >
              You're all caught up! Check back later for updates.
            </motion.p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleMarkAsRead(notification.id)}
                className={`bg-bg-secondary border rounded-lg p-4 cursor-pointer transition-all ${
                  notification.read
                    ? 'border-gray-800 opacity-60'
                    : 'border-primary border-opacity-50 hover:border-primary'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3
                          className={`text-sm font-heading mb-1 ${
                            notification.read ? 'text-gray-400' : 'text-white'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p
                          className={`text-sm font-body ${
                            notification.read ? 'text-gray-500' : 'text-gray-300'
                          }`}
                        >
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2 ml-2" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-body">
                      {formatTimestamp(notification.created_at)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

