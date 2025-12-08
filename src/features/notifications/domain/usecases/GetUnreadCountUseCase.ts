import { INotificationRepository } from '../repositories/INotificationRepository';

export class GetUnreadCountUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(userMobile: string): Promise<number> {
    if (!userMobile) {
      return 0;
    }

    return this.repository.getUnreadCount(userMobile);
  }
}




