import { IAuthRepository } from '../repositories/IAuthRepository';
import { SignupData, User } from '../entities/User';

export class CreateUserUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(signupData: SignupData): Promise<User> {
    // Validate signup data
    if (!signupData.name || !signupData.ff_id) {
      throw new Error('Name and Free Fire ID are required');
    }

    // Create user via repository
    return await this.authRepository.createUser(signupData);
  }
}

