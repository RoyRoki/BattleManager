import { useState, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '../../../../services/firebaseService';
import { Notification } from '../../domain/entities/Notification';
import { NotificationRepository } from '../../data/repositories/NotificationRepository';
import { GetNotificationsUseCase } from '../../domain/usecases/GetNotificationsUseCase';
import { GetUnreadCountUseCase } from '../../domain/usecases/GetUnreadCountUseCase';
import { MarkAsReadUseCase } from '../../domain/usecases/MarkAsReadUseCase';
import { MarkAllAsReadUseCase } from '../../domain/usecases/MarkAllAsReadUseCase';

interface UseNotificationViewModelReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | undefined;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => void;
}

export const useNotificationViewModel = (
  userMobile: string | null
): UseNotificationViewModelReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const repository = new NotificationRepository();
  const getNotificationsUseCase = new GetNotificationsUseCase(repository);
  const getUnreadCountUseCase = new GetUnreadCountUseCase(repository);
  const markAsReadUseCase = new MarkAsReadUseCase(repository);
  const markAllAsReadUseCase = new MarkAllAsReadUseCase(repository);

  // Use react-firebase-hooks for real-time updates
  const [notificationsSnapshot, isLoading, error] = useCollection(
    userMobile
      ? query(
          collection(firestore, 'notifications'),
          where('user_mobile', '==', userMobile),
          orderBy('created_at', 'desc')
        )
      : null
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];

  const [unreadSnapshot, unreadLoading, unreadError] = useCollection(
    userMobile
      ? query(
          collection(firestore, 'notifications'),
          where('user_mobile', '==', userMobile),
          where('read', '==', false)
        )
      : null
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];

  // Log errors for debugging
  useEffect(() => {
    if (error) {
      console.error('Error loading notifications:', error);
      if (error.message?.includes('index')) {
        console.error(
          'Firestore index missing. Please deploy indexes: firebase deploy --only firestore:indexes'
        );
      }
    }
    if (unreadError) {
      console.error('Error loading unread count:', unreadError);
    }
  }, [error, unreadError]);

  // Update notifications from snapshot
  useEffect(() => {
    if (notificationsSnapshot?.docs) {
      const notificationList: Notification[] = notificationsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          user_mobile: data.user_mobile,
          type: data.type,
          title: data.title,
          message: data.message,
          read: data.read || false,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
          metadata: data.metadata || {},
        } as Notification;
      });
      setNotifications(notificationList);
    } else {
      setNotifications([]);
    }
  }, [notificationsSnapshot, refreshTrigger]);

  // Update unread count from snapshot
  useEffect(() => {
    if (unreadSnapshot?.docs) {
      setUnreadCount(unreadSnapshot.docs.length);
    } else {
      setUnreadCount(0);
    }
  }, [unreadSnapshot, refreshTrigger]);

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      await markAsReadUseCase.execute(notificationId);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    if (!userMobile) return;

    try {
      await markAllAsReadUseCase.execute(userMobile);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  };

  const refresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return {
    notifications,
    unreadCount,
    isLoading: isLoading || unreadLoading,
    error: error || unreadError,
    markAsRead,
    markAllAsRead,
    refresh,
  };
};

