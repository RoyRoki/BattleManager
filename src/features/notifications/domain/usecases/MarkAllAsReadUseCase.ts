import { INotificationRepository } from '../repositories/INotificationRepository';

export class MarkAllAsReadUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(userMobile: string): Promise<void> {
    if (!userMobile) {
      throw new Error('User mobile number is required');
    }

    return this.repository.markAllAsRead(userMobile);
  }
}






