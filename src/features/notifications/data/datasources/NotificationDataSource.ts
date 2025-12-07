import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { firestore } from '../../../../services/firebaseService';
import { Notification, NotificationType } from '../../domain/entities/Notification';

export interface INotificationDataSource {
  getNotificationsByUser(userMobile: string, limitCount?: number): Promise<Notification[]>;
  getUnreadCount(userMobile: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userMobile: string): Promise<void>;
}

export class NotificationDataSource implements INotificationDataSource {
  private readonly collectionName = 'notifications';

  /**
   * Get notifications for a user, ordered by most recent first
   */
  async getNotificationsByUser(
    userMobile: string,
    limitCount?: number
  ): Promise<Notification[]> {
    try {
      const notificationsRef = collection(firestore, this.collectionName);
      let q = query(
        notificationsRef,
        where('user_mobile', '==', userMobile),
        orderBy('created_at', 'desc')
      );

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          user_mobile: data.user_mobile,
          type: data.type as NotificationType,
          title: data.title,
          message: data.message,
          read: data.read || false,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
          metadata: data.metadata || {},
        } as Notification;
      });
    } catch (error: any) {
      console.error('NotificationDataSource: Error getting notifications:', error);
      throw new Error(error.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(userMobile: string): Promise<number> {
    try {
      const notificationsRef = collection(firestore, this.collectionName);
      const q = query(
        notificationsRef,
        where('user_mobile', '==', userMobile),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error: any) {
      console.error('NotificationDataSource: Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(firestore, this.collectionName, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        updated_at: Timestamp.now(),
      });
    } catch (error: any) {
      console.error('NotificationDataSource: Error marking notification as read:', error);
      throw new Error(error.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userMobile: string): Promise<void> {
    try {
      const notificationsRef = collection(firestore, this.collectionName);
      const q = query(
        notificationsRef,
        where('user_mobile', '==', userMobile),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);

      snapshot.docs.forEach((doc) => {
        const notificationRef = doc.ref;
        batch.update(notificationRef, {
          read: true,
          updated_at: Timestamp.now(),
        });
      });

      await batch.commit();
    } catch (error: any) {
      console.error('NotificationDataSource: Error marking all as read:', error);
      throw new Error(error.message || 'Failed to mark all notifications as read');
    }
  }
}


