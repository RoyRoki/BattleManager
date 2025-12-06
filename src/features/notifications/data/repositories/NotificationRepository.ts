import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { Notification } from '../../domain/entities/Notification';
import {
  INotificationDataSource,
  NotificationDataSource,
} from '../datasources/NotificationDataSource';

export class NotificationRepository implements INotificationRepository {
  constructor(private dataSource: INotificationDataSource = new NotificationDataSource()) {}

  async getNotifications(userMobile: string, limitCount?: number): Promise<Notification[]> {
    return this.dataSource.getNotificationsByUser(userMobile, limitCount);
  }

  async getUnreadCount(userMobile: string): Promise<number> {
    return this.dataSource.getUnreadCount(userMobile);
  }

  async markAsRead(notificationId: string): Promise<void> {
    return this.dataSource.markAsRead(notificationId);
  }

  async markAllAsRead(userMobile: string): Promise<void> {
    return this.dataSource.markAllAsRead(userMobile);
  }
}

