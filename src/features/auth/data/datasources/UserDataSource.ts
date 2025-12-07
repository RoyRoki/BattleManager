import { User, SignupData } from '../../domain/entities/User';

export interface IUserDataSource {
  checkUserExists(email: string): Promise<boolean>;
  createUser(signupData: SignupData): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
}

export class UserDataSource implements IUserDataSource {
  async checkUserExists(_email: string): Promise<boolean> {
    // Implementation would go here
    return false;
  }

  async createUser(_signupData: SignupData): Promise<User> {
    // Implementation would go here
    throw new Error('Not implemented');
  }

  async getUserByEmail(_email: string): Promise<User | null> {
    // Implementation would go here
    return null;
  }
}
