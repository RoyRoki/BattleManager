import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { User, SignupData } from '../../domain/entities/User';
import { OTPVerificationResponse } from '../../domain/entities/OTPRequest';
import { OTPDataSource } from '../datasources/OTPDataSource';
import { UserDataSource } from '../datasources/UserDataSource';

export class AuthRepository implements IAuthRepository {
  private otpDataSource: OTPDataSource;
  private userDataSource: UserDataSource;

  constructor(
    otpDataSource: OTPDataSource = new OTPDataSource(),
    userDataSource: UserDataSource = new UserDataSource()
  ) {
    this.otpDataSource = otpDataSource;
    this.userDataSource = userDataSource;
  }

  async sendOTP(mobileNumber: string): Promise<void> {
    return this.otpDataSource.sendOTP(mobileNumber);
  }

  async verifyOTP(mobileNumber: string, otp: string): Promise<OTPVerificationResponse> {
    return this.otpDataSource.verifyOTP(mobileNumber, otp);
  }

  async checkUserExists(mobileNumber: string): Promise<boolean> {
    return this.userDataSource.checkUserExists(mobileNumber);
  }

  async createUser(signupData: SignupData): Promise<User> {
    return this.userDataSource.createUser(signupData);
  }

  async getUserByMobile(mobileNumber: string): Promise<User | null> {
    return this.userDataSource.getUserByMobile(mobileNumber);
  }
}

