import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../../../services/firebaseService';
import { User, SignupData } from '../../domain/entities/User';

export interface IUserDataSource {
  checkUserExists(mobileNumber: string): Promise<boolean>;
  getUserByMobile(mobileNumber: string): Promise<User | null>;
  createUser(signupData: SignupData): Promise<User>;
}

export class UserDataSource implements IUserDataSource {
  /**
   * Check if a user exists with the given mobile number
   */
  async checkUserExists(mobileNumber: string): Promise<boolean> {
    try {
      console.log('UserDataSource: Checking user existence for:', mobileNumber);
      const userRef = doc(firestore, 'users', mobileNumber);
      console.log('UserDataSource: Firestore reference created');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('checkUserExists timeout after 10 seconds')), 10000);
      });
      
      const docPromise = getDoc(userRef).then((userDoc) => {
        console.log('UserDataSource: Document fetched, exists:', userDoc.exists());
        return userDoc.exists();
      });
      
      const result = await Promise.race([docPromise, timeoutPromise]);
      console.log('UserDataSource: Result:', result);
      return result as boolean;
    } catch (error: any) {
      console.error('UserDataSource: Error checking user:', error);
      console.error('UserDataSource: Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      // If it's a permission error, assume user doesn't exist (new user flow)
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('UserDataSource: Permission denied - treating as new user');
        return false;
      }
      
      // For other errors, also default to false (new user) to allow signup flow
      return false;
    }
  }

  /**
   * Get user by mobile number
   */
  async getUserByMobile(mobileNumber: string): Promise<User | null> {
    try {
      const userRef = doc(firestore, 'users', mobileNumber);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const data = userDoc.data();
      return {
        mobile_no: data.mobile_no,
        name: data.name,
        ff_id: data.ff_id,
        avatar_url: data.avatar_url,
        points: data.points || 0,
        enrolled_tournaments: data.enrolled_tournaments || [],
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
        is_active: data.is_active !== false,
      } as User;
    } catch (error: any) {
      console.error('UserDataSource: Error getting user:', error);
      return null;
    }
  }

  /**
   * Create a new user account
   */
  async createUser(signupData: SignupData): Promise<User> {
    try {
      console.log('UserDataSource: Creating user:', signupData.mobileNumber);
      
      const userRef = doc(firestore, 'users', signupData.mobileNumber);
      const now = new Date();
      
      const userData: User = {
        mobile_no: signupData.mobileNumber,
        name: signupData.name,
        ff_id: signupData.ff_id,
        points: 0,
        enrolled_tournaments: [],
        created_at: now,
        updated_at: now,
        is_active: true,
      };
      
      await setDoc(userRef, userData);
      console.log('UserDataSource: User created successfully');
      
      return userData;
    } catch (error: any) {
      console.error('UserDataSource: Error creating user:', error);
      throw new Error(error.message || 'Failed to create user');
    }
  }
}

