import { User, SignupData } from '../entities/User';
import { OTPVerificationResponse } from '../entities/OTPRequest';

export interface IAuthRepository {
  sendOTP(email: string): Promise<void>;
  verifyOTP(email: string, otp: string): Promise<OTPVerificationResponse>;
  checkUserExists(email: string): Promise<boolean>;
  createUser(signupData: SignupData): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
}
