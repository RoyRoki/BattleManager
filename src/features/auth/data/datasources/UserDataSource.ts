import { User, SignupData } from '../../domain/entities/User';

export interface IUserDataSource {
  checkUserExists(mobileNumber: string): Promise<boolean>;
  createUser(signupData: SignupData): Promise<User>;
  getUserByMobile(mobileNumber: string): Promise<User | null>;
}

export class UserDataSource implements IUserDataSource {
  async checkUserExists(_mobileNumber: string): Promise<boolean> {
    // Implementation would go here
    return false;
  }

  async createUser(_signupData: SignupData): Promise<User> {
    // Implementation would go here
    throw new Error('Not implemented');
  }

  async getUserByMobile(_mobileNumber: string): Promise<User | null> {
    // Implementation would go here
    return null;
  }
}
