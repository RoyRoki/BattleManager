import { User, SignupData } from '../entities/User';
import { OTPVerificationResponse } from '../entities/OTPRequest';

export interface IAuthRepository {
  /**
   * Send OTP to the given mobile number
   * @param mobileNumber - 10-digit mobile number
   * @returns Promise that resolves when OTP is sent
   */
  sendOTP(mobileNumber: string): Promise<void>;

  /**
   * Verify OTP for the given mobile number
   * @param mobileNumber - 10-digit mobile number
   * @param otp - 6-digit OTP code
   * @returns Promise with verification result
   */
  verifyOTP(mobileNumber: string, otp: string): Promise<OTPVerificationResponse>;

  /**
   * Check if a user exists with the given mobile number
   * @param mobileNumber - 10-digit mobile number
   * @returns Promise that resolves to true if user exists, false otherwise
   */
  checkUserExists(mobileNumber: string): Promise<boolean>;

  /**
   * Create a new user account
   * @param signupData - User signup information
   * @returns Promise that resolves when user is created
   */
  createUser(signupData: SignupData): Promise<User>;

  /**
   * Get user by mobile number
   * @param mobileNumber - 10-digit mobile number
   * @returns Promise that resolves to User or null if not found
   */
  getUserByMobile(mobileNumber: string): Promise<User | null>;
}


