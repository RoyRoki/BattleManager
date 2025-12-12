import { INotificationRepository } from '../repositories/INotificationRepository';
import { Notification } from '../entities/Notification';

export class GetNotificationsUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(userMobile: string, limitCount?: number): Promise<Notification[]> {
    if (!userMobile) {
      throw new Error('User mobile number is required');
    }

    return this.repository.getNotifications(userMobile, limitCount);
  }
}










