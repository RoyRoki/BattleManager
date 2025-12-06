import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../services/firebaseService';
import { User } from '../types';

// Get API key to check if Auth should be initialized
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (mobileNo: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Storage key for persistent auth
const AUTH_STORAGE_KEY = 'battlemanager_auth_mobile';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (mobileNo: string) => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', mobileNo));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const user: User = {
          ...userData,
          created_at:
            userData.created_at instanceof Date
              ? userData.created_at
              : (userData.created_at as any)?.toDate?.() || new Date(),
          updated_at:
            userData.updated_at instanceof Date
              ? userData.updated_at
              : (userData.updated_at as any)?.toDate?.() || new Date(),
        };
        setUser(user);
        // Store mobile number in localStorage for persistence
        localStorage.setItem(AUTH_STORAGE_KEY, mobileNo);
        return user;
      } else {
        // User not found - clear stored auth
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // On error, don't clear stored auth - might be temporary network issue
      return null;
    }
  };

  const checkAdminStatus = async (firebaseUser: FirebaseUser) => {
    try {
      const idTokenResult = await firebaseUser.getIdTokenResult();
      setIsAdmin(idTokenResult.claims.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    // Check for stored authentication on app load/refresh
    const restoreAuth = async () => {
      try {
        // First, check localStorage for stored mobile number (custom OTP flow)
        const storedMobile = localStorage.getItem(AUTH_STORAGE_KEY);
        
        if (storedMobile) {
          console.log('AuthContext: Restoring auth from localStorage:', storedMobile);
          const restoredUser = await fetchUserData(storedMobile);
          if (restoredUser && isMounted) {
            console.log('AuthContext: User restored successfully');
            setIsLoading(false);
            return;
          } else if (isMounted) {
            // User not found in Firestore - clear invalid auth
            console.warn('AuthContext: Stored user not found, clearing auth');
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }

        // Then check Firebase Auth for admin users
        // Only subscribe to Firebase Auth for admin users
        // Regular users use custom OTP flow, so we don't need Firebase Auth for them
        // Firebase Auth will only be used when an admin logs in via email/password
        
        // Check if auth is properly initialized
        if (!auth || !apiKey) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        // Subscribe to auth state changes (only relevant for admin users)
        // This will be null for regular users since they don't use Firebase Auth
        unsubscribe = onAuthStateChanged(
          auth,
          async (firebaseUser) => {
            if (!isMounted) return;
            
            setFirebaseUser(firebaseUser);
            if (firebaseUser) {
              await checkAdminStatus(firebaseUser);
              // For admin users, mobile_no might be in custom claims or email
              // For regular users, mobile_no is the UID
              const mobileNo = firebaseUser.uid;
              await fetchUserData(mobileNo);
            } else {
              // No Firebase Auth user - this is normal for regular users
              // Only clear if we don't have a stored mobile number
              if (!storedMobile) {
                setUser(null);
                setIsAdmin(false);
              }
            }
            if (isMounted) {
              setIsLoading(false);
            }
          },
          (error) => {
            // Handle auth errors gracefully - regular users don't need Firebase Auth
            console.warn('Firebase Auth state change error (this is normal for non-admin users):', error.message);
            if (isMounted) {
              setIsLoading(false);
            }
          }
        );
      } catch (error) {
        console.error('AuthContext: Error restoring auth:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = async (mobileNo: string) => {
    // After OTP verification, fetch user data
    // User document should already be created in useOTP hook
    await fetchUserData(mobileNo);
  };

  const logout = async () => {
    // Only sign out from Firebase Auth if user is logged in via Firebase Auth (admin)
    // Regular users logged in via OTP don't need Firebase Auth sign out
    if (firebaseUser && auth) {
      try {
        await auth.signOut();
      } catch (error) {
        console.warn('Error signing out from Firebase Auth:', error);
      }
    }
    // Clear stored authentication
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setFirebaseUser(null);
    setIsAdmin(false);
  };

  const refreshUser = async () => {
    if (user?.mobile_no) {
      await fetchUserData(user.mobile_no);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isAdmin,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


