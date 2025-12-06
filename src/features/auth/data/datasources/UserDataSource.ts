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
   * Uses retry logic with exponential backoff for better reliability
   */
  async checkUserExists(mobileNumber: string): Promise<boolean> {
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 60000; // 60 seconds (1 minute) timeout per attempt for production
    let lastError: Error | null = null;
    
    console.log('UserDataSource: Checking user existence for:', mobileNumber);
    
    // Check if Firestore is initialized
    if (!firestore) {
      console.error('UserDataSource: Firestore not initialized');
      throw new Error('Firestore is not initialized. Please check your connection.');
    }
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      try {
        console.log(`UserDataSource: Attempt ${attempt + 1}/${MAX_RETRIES}`);
        
        const userRef = doc(firestore, 'users', mobileNumber);
        
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`checkUserExists timeout after ${TIMEOUT_MS / 1000} seconds`));
          }, TIMEOUT_MS);
        });
        
        // Create Firestore query promise
        const docPromise = getDoc(userRef)
          .then((userDoc) => {
            // Clear timeout on success
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            const exists = userDoc.exists();
            console.log('UserDataSource: Document fetched, exists:', exists);
            return exists;
          })
          .catch((error) => {
            // Clear timeout on error
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            throw error;
          });
        
        // Race between Firestore call and timeout
        const result = await Promise.race([docPromise, timeoutPromise]);
        console.log('UserDataSource: Successfully checked user, exists:', result);
        return result as boolean;
      } catch (error: any) {
        // Ensure timeout is cleared
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        lastError = error;
        const isLastAttempt = attempt === MAX_RETRIES - 1;
        
        // Handle specific error codes
        if (error.code === 'permission-denied') {
          console.warn('UserDataSource: Permission denied');
          // Permission errors are definitive - user likely doesn't exist or rules block access
          // Return false but don't throw (allows signup flow)
          return false;
        }
        
        // For timeout/network errors, retry unless it's the last attempt
        const isTimeoutOrNetworkError = 
          error.message?.includes('timeout') ||
          error.code === 'unavailable' ||
          error.code === 'deadline-exceeded' ||
          error.message?.includes('network') ||
          error.code === 'cancelled';
        
        if (isTimeoutOrNetworkError && !isLastAttempt) {
          // Exponential backoff: wait 1s, 2s, 4s
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.warn(`UserDataSource: Retryable error (${error.message}), retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue; // Retry
        }
        
        // If it's the last attempt or a non-retryable error, throw
        if (isLastAttempt) {
          console.error('UserDataSource: All retry attempts failed:', error);
          // Format a user-friendly error message
          if (isTimeoutOrNetworkError) {
            throw new Error('Unable to check user. Please check your internet connection and try again.');
          }
          throw new Error(`Failed to check user: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Failed to check user after retries');
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

