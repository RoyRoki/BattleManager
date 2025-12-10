import { INotificationRepository } from '../repositories/INotificationRepository';

export class MarkAsReadUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(notificationId: string): Promise<void> {
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }

    return this.repository.markAsRead(notificationId);
  }
}








