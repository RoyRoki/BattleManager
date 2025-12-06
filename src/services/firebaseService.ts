import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

// Get environment variables with fallbacks
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;
const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

// Validate required config and log initialization status
const envCheck = {
  apiKey: !!apiKey,
  authDomain: !!authDomain,
  projectId: !!projectId,
  storageBucket: !!storageBucket,
  messagingSenderId: !!messagingSenderId,
  appId: !!appId,
  databaseURL: !!databaseURL,
};

const missingVars = Object.entries(envCheck)
  .filter(([_, exists]) => !exists)
  .map(([key]) => key);

if (!projectId) {
  console.error('❌ Firebase Project ID is missing. Please check your environment variables.');
  console.error('   See ENV_SETUP.md for instructions.');
}

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing Firebase environment variables: ${missingVars.join(', ')}`);
  console.warn('   This may cause initialization issues. Check your environment configuration.');
} else {
  console.log('✅ All Firebase environment variables are present');
}

if (!databaseURL) {
  console.warn('⚠️  Firebase Database URL is missing. Realtime Database features will be disabled.');
  console.warn('   See ENV_SETUP.md for instructions.');
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  databaseURL, // Required for Realtime Database
};

let app: FirebaseApp;
let firestore: Firestore;
let database: Database | null = null;
let auth: Auth | null = null;

// Initialize Firebase with logging
const initStartTime = Date.now();

if (getApps().length === 0) {
  try {
    console.log('🔧 Initializing Firebase app...');
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
    
    console.log('🔧 Initializing Firestore...');
    firestore = getFirestore(app);
    console.log('✅ Firestore initialized successfully');
    
    // Only initialize database if URL is provided
    if (databaseURL) {
      console.log('🔧 Initializing Realtime Database...');
      database = getDatabase(app);
      console.log('✅ Realtime Database initialized successfully');
    } else {
      console.warn('⚠️  Firebase Realtime Database not initialized - databaseURL is missing');
    }
    
    // Only initialize Auth if API key is provided (needed for admin login)
    // Regular users use custom OTP flow, so Auth is optional
    if (apiKey && authDomain) {
      try {
        console.log('🔧 Initializing Firebase Auth...');
        auth = getAuth(app);
        console.log('✅ Firebase Auth initialized successfully');
      } catch (error: any) {
        console.warn(
          '⚠️  Firebase Auth initialization error (this is OK for custom OTP flow):',
          error?.message
        );
        auth = null;
      }
    } else {
      console.warn(
        '⚠️  Firebase Auth not initialized - API key or auth domain missing (expected for custom OTP flow)'
      );
    }
    
    const initDuration = Date.now() - initStartTime;
    console.log(`✅ Firebase initialization completed in ${initDuration}ms`);
  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error?.message);
    console.error('   Check your Firebase configuration and environment variables.');
    throw error;
  }
} else {
  console.log('ℹ️  Firebase app already initialized, reusing existing instance');
  app = getApps()[0];
  firestore = getFirestore(app);

  if (databaseURL) {
    database = getDatabase(app);
  }

  // Only initialize Auth if API key is provided
  if (apiKey && authDomain) {
    try {
      auth = getAuth(app);
    } catch (error: any) {
      console.warn('⚠️  Firebase Auth initialization error:', error?.message);
      auth = null;
    }
  }
}

// Helper function to check if Firebase is properly initialized
export const isFirebaseInitialized = (): boolean => {
  const isInitialized = !!firestore && !!projectId;
  if (!isInitialized) {
    console.warn('⚠️  Firebase is not fully initialized. Check environment variables.');
  }
  return isInitialized;
};

// Helper function to get initialization status for debugging
export const getFirebaseInitStatus = () => {
  return {
    app: !!app,
    firestore: !!firestore,
    database: !!database,
    auth: !!auth,
    projectId: !!projectId,
    hasApiKey: !!apiKey,
    hasAuthDomain: !!authDomain,
    hasDatabaseURL: !!databaseURL,
  };
};

export { app, firestore, database, auth };
export default app;


