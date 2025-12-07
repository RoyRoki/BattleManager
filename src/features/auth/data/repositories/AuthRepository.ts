import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { User, SignupData } from '../../domain/entities/User';
import { OTPVerificationResponse } from '../../domain/entities/OTPRequest';
import { IOTPDataSource } from '../datasources/OTPDataSource';
import { IUserDataSource } from '../datasources/UserDataSource';

export class AuthRepository implements IAuthRepository {
  constructor(
    private otpDataSource: IOTPDataSource,
    private userDataSource: IUserDataSource
  ) {}

  async sendOTP(mobileNumber: string): Promise<void> {
    await this.otpDataSource.sendOTP(mobileNumber);
  }

  async verifyOTP(mobileNumber: string, otp: string): Promise<OTPVerificationResponse> {
    return await this.otpDataSource.verifyOTP(mobileNumber, otp);
  }

  async checkUserExists(mobileNumber: string): Promise<boolean> {
    return await this.userDataSource.checkUserExists(mobileNumber);
  }

  async createUser(signupData: SignupData): Promise<User> {
    return await this.userDataSource.createUser(signupData);
  }

  async getUserByMobile(mobileNumber: string): Promise<User | null> {
    return await this.userDataSource.getUserByMobile(mobileNumber);
  }
}
