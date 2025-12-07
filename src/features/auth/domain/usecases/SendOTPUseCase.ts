import { IAuthRepository } from '../repositories/IAuthRepository';
import { emailSchema } from '../../../../utils/validations';

export class SendOTPUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string): Promise<void> {
    // Validate email
    emailSchema.parse(email);
    
    // Send OTP via repository
    await this.authRepository.sendOTP(email);
  }
}


