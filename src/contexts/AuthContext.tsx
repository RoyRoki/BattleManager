import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
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
  login: (email: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
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
const AUTH_STORAGE_KEY = 'battlemanager_auth_email';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (email: string) => {
    try {
      // Normalize email (lowercase) for Firestore lookup
      const normalizedEmail = email.toLowerCase().trim();
      
      // Skip Firestore lookup for Firebase Auth UIDs (admin users)
      // Admin users use Firebase Auth, not the users collection
      // The users collection uses email addresses as document IDs
      // If email looks like a Firebase UID (long alphanumeric without @), skip
      if (normalizedEmail.length > 50 || !normalizedEmail.includes('@')) {
        // This might be a Firebase Auth UID, not an email
        // Admin users don't have documents in the users collection
        console.log('Skipping Firestore lookup for potential Firebase Auth UID (admin user)');
        return null;
      }

      const userDoc = await getDoc(doc(firestore, 'users', normalizedEmail));
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
        // Store email in localStorage for persistence
        localStorage.setItem(AUTH_STORAGE_KEY, normalizedEmail);
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

  const checkAdminStatus = async (firebaseUser: FirebaseUser, forceRefresh: boolean = false) => {
    try {
      // Get token result - force refresh if requested
      // On page refresh, we first try cached token, then force refresh if needed
      const idTokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
      const isAdminRole = idTokenResult.claims.role === 'admin';
      setIsAdmin(isAdminRole);
      
      console.log(`Admin status check (${forceRefresh ? 'forced refresh' : 'cached token'}):`, {
        isAdmin: isAdminRole,
        role: idTokenResult.claims.role || 'none',
        tokenIssuedAt: new Date(idTokenResult.issuedAtTime),
        email: firebaseUser.email,
      });
      
      return isAdminRole;
    } catch (error: any) {
      console.error('Error checking admin status:', error);
      // Don't immediately set isAdmin to false on error - might be temporary
      // Only set to false if it's a clear auth error
      if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-disabled') {
        setIsAdmin(false);
      }
      return false;
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    // Check for stored authentication on app load/refresh
    const restoreAuth = async () => {
      try {
        // First, check localStorage for stored email (custom OTP flow)
        const storedEmail = localStorage.getItem(AUTH_STORAGE_KEY);
        
        if (storedEmail) {
          console.log('AuthContext: Restoring auth from localStorage:', storedEmail);
          const restoredUser = await fetchUserData(storedEmail);
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
              console.log('AuthContext: Firebase Auth user detected:', firebaseUser.email);
              
              // First, try checking admin status with cached token (faster, works on refresh)
              // Only force refresh if cached token doesn't show admin role
              let isAdminRole = await checkAdminStatus(firebaseUser, false);
              
              // If not admin with cached token, try forcing refresh (might be a new claim)
              // But only do this if we're not in the initial load (to avoid unnecessary refreshes on every page load)
              if (!isAdminRole) {
                console.log('AuthContext: Cached token shows no admin role, trying forced refresh...');
                // Wait a bit before forcing refresh to allow Firebase to restore session
                await new Promise(resolve => setTimeout(resolve, 500));
                isAdminRole = await checkAdminStatus(firebaseUser, true);
              }
              
              // For admin users, don't try to fetch from Firestore users collection
              // Admin users are authenticated via Firebase Auth, not the custom OTP flow
              // Only fetch user data if this is a regular user (email as UID)
              // Firebase Auth UIDs are long alphanumeric strings, emails contain @
              const uid = firebaseUser.uid;
              // Only fetch if it looks like an email (contains @)
              if (uid.includes('@')) {
                await fetchUserData(uid);
              } else {
                // This is an admin user - don't fetch from Firestore
                console.log('AuthContext: Admin user detected - skipping Firestore user lookup');
              }
            } else {
              // No Firebase Auth user - this is normal for regular users
              // Only clear if we don't have a stored email
              if (!storedEmail) {
                console.log('AuthContext: No Firebase Auth user and no stored email - clearing auth');
                setUser(null);
                setIsAdmin(false);
              } else {
                console.log('AuthContext: No Firebase Auth user but stored email exists - keeping regular user auth');
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

  const login = async (email: string) => {
    // After OTP verification, fetch user data
    // User document should already be created in useOTP hook
    await fetchUserData(email);
  };

  const adminLogin = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please check your environment variables.');
    }
    try {
      // Sign out any existing user first to ensure clean state
      // This is critical - old tokens won't have new custom claims
      try {
        if (auth.currentUser) {
          console.log('Signing out existing user to ensure clean state...');
          await auth.signOut();
          // Wait a moment for sign out to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (signOutError) {
        // Ignore sign out errors - user might not be signed in
        console.log('No existing user to sign out');
      }

      console.log('Signing in with email/password...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('Login successful, checking admin status...');
      
      // Force token refresh with retry logic (custom claims can take a moment to propagate)
      // Important: After setting custom claims, Firebase needs time to propagate them
      // The token refresh must happen AFTER the claims are propagated
      let isAdmin = false;
      let retries = 6; // Try up to 6 times
      const baseDelay = 2000; // Start with 2 seconds
      
      while (retries > 0 && !isAdmin) {
        const attemptNumber = 7 - retries;
        console.log(`Admin status check attempt ${attemptNumber}/${6}...`);
        
        // Force refresh the token - this gets a new token from Firebase
        // The true parameter forces a refresh from the server
        await firebaseUser.getIdToken(true);
        
        // Wait for Firebase to propagate custom claims
        // Custom claims can take 1-10 seconds to propagate after being set
        // Use exponential backoff: 2s, 3s, 4s, 5s, 6s, 7s
        const delay = baseDelay + (attemptNumber - 1) * 1000;
        if (retries < 6) {
          console.log(`Waiting ${delay}ms for claims to propagate...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Get the token result with claims - force refresh again
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        const userRole = idTokenResult.claims?.role;
        
        console.log(`Attempt ${attemptNumber} result:`, {
          role: userRole || 'undefined',
          allClaims: idTokenResult.claims,
          tokenIssuedAt: new Date(idTokenResult.issuedAtTime),
        });
        
        if (userRole === 'admin') {
          isAdmin = true;
          console.log('✅ Admin role confirmed!');
          break;
        }
        
        retries--;
      }
      
      if (!isAdmin) {
        // Sign out if not admin
        console.log('Admin role not found, signing out...');
        await auth.signOut();
        
        // Provide helpful error message
        const errorMessage = `Access denied. Admin privileges not found in token. This usually means:

1. The custom claim was just set - wait 10-30 seconds and try again
2. You need to completely sign out and sign in again
3. The claim wasn't set - run: node scripts/setup-admin.js ${email}

To verify the claim is set, run: node scripts/verify-admin.js ${email}`;
        
        throw new Error(errorMessage);
      }
      
      // Verify admin status one more time using checkAdminStatus
      // This ensures the state is properly set
      await checkAdminStatus(firebaseUser, true);
      
      console.log('✅ Admin login successful - user has admin role');
      
      // Admin login successful - Firebase Auth state change will handle the rest
      // The useEffect will pick up the auth state change and set isAdmin
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      // Handle Firebase Auth errors
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please create the user in Firebase Console first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address. Please check your email.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      }
      
      // Re-throw our custom errors or Firebase errors
      throw error;
    }
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
    if (user?.email) {
      await fetchUserData(user.email);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isAdmin,
    isLoading,
    login,
    adminLogin,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


