import { Notification } from '../entities/Notification';

export interface INotificationRepository {
  getNotifications(userMobile: string, limitCount?: number): Promise<Notification[]>;
  getUnreadCount(userMobile: string): Promise<number>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userMobile: string): Promise<void>;
}













