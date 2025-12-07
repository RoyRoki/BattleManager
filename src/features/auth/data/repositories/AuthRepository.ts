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

  async sendOTP(email: string): Promise<void> {
    await this.otpDataSource.sendOTP(email);
  }

  async verifyOTP(email: string, otp: string): Promise<OTPVerificationResponse> {
    return await this.otpDataSource.verifyOTP(email, otp);
  }

  async checkUserExists(email: string): Promise<boolean> {
    return await this.userDataSource.checkUserExists(email);
  }

  async createUser(signupData: SignupData): Promise<User> {
    return await this.userDataSource.createUser(signupData);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userDataSource.getUserByEmail(email);
  }
}
