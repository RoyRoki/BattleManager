import { User, SignupData } from '../entities/User';
import { OTPVerificationResponse } from '../entities/OTPRequest';

export interface IAuthRepository {
  sendOTP(mobileNumber: string): Promise<void>;
  verifyOTP(mobileNumber: string, otp: string): Promise<OTPVerificationResponse>;
  checkUserExists(mobileNumber: string): Promise<boolean>;
  createUser(signupData: SignupData): Promise<User>;
  getUserByMobile(mobileNumber: string): Promise<User | null>;
}
