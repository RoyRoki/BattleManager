import { IAuthRepository } from '../repositories/IAuthRepository';
import { SignupData, User } from '../entities/User';
import { otpSchema } from '../../../../utils/validations';
import toast from 'react-hot-toast';

export interface VerifyOTPResult {
  success: boolean;
  user?: User;
  error?: string;
  remainingAttempts?: number;
}

export class VerifyOTPUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(
    mobileNumber: string,
    otp: string,
    signupData?: SignupData
  ): Promise<VerifyOTPResult> {
    // Validate OTP
    otpSchema.parse(otp);

    // Verify OTP via repository
    const verificationResult = await this.authRepository.verifyOTP(mobileNumber, otp);

    if (!verificationResult.success) {
      return {
        success: false,
        error: verificationResult.error,
        remainingAttempts: verificationResult.remainingAttempts,
      };
    }

    // OTP is verified - check if user exists
    const userExists = await this.authRepository.checkUserExists(mobileNumber);

    if (!userExists) {
      // New user signup - require signup data
      if (!signupData || !signupData.name || !signupData.ff_id) {
        return {
          success: false,
          error: 'Please provide name and Free Fire ID for signup',
        };
      }

      // Create new user
      const user = await this.authRepository.createUser(signupData);
      toast.success('Account created successfully!');
      
      return {
        success: true,
        user,
      };
    } else {
      // Existing user login
      const user = await this.authRepository.getUserByMobile(mobileNumber);
      toast.success('Login successful!');
      
      return {
        success: true,
        user: user || undefined,
      };
    }
  }
}

