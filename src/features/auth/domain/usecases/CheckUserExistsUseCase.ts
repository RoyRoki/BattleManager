import { IAuthRepository } from '../repositories/IAuthRepository';

export class CheckUserExistsUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string): Promise<boolean> {
    try {
      return await this.authRepository.checkUserExists(email);
    } catch (error: any) {
      // If there's an error (e.g., permission denied), assume user doesn't exist
      console.warn('CheckUserExistsUseCase: Error checking user, assuming new user:', error);
      return false;
    }
  }
}


