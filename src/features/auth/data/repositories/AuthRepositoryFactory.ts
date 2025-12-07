import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { AuthRepository } from './AuthRepository';
import { OTPDataSource } from '../datasources/OTPDataSource';
import { UserDataSource } from '../datasources/UserDataSource';

/**
 * Factory to create AuthRepository instance
 * This allows the presentation layer to get a repository without directly importing data layer classes
 */
export const createAuthRepository = (): IAuthRepository => {
  const otpDataSource = new OTPDataSource();
  const userDataSource = new UserDataSource();
  return new AuthRepository(otpDataSource, userDataSource);
};


