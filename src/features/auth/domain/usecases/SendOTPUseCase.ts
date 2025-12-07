import { IAuthRepository } from '../repositories/IAuthRepository';
import { mobileSchema } from '../../../../utils/validations';

export class SendOTPUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(mobileNumber: string): Promise<void> {
    // Validate mobile number
    mobileSchema.parse(mobileNumber);
    
    // Send OTP via repository
    await this.authRepository.sendOTP(mobileNumber);
  }
}


