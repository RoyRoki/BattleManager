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

// Validate required config
if (!projectId) {
  console.error('❌ Firebase Project ID is missing. Please check your .env.local file.');
  console.error('   See ENV_SETUP.md for instructions.');
}

if (!databaseURL) {
  console.warn('⚠️  Firebase Database URL is missing. Realtime Database features will be disabled.');
  console.warn('   Please check your .env.local file. See ENV_SETUP.md for instructions.');
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

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  
  // Only initialize database if URL is provided
  if (databaseURL) {
    database = getDatabase(app);
  } else {
    console.warn('Firebase Realtime Database not initialized - databaseURL is missing');
  }
  
  // Only initialize Auth if API key is provided (needed for admin login)
  // Regular users use custom OTP flow, so Auth is optional
  // Initialize Auth even if it might error - we'll handle errors gracefully
  if (apiKey && authDomain) {
    try {
      auth = getAuth(app);
      // Set persistence to avoid unnecessary API calls
      // For custom OTP flow, we don't need persistent auth state
    } catch (error: any) {
      console.warn(
        'Firebase Auth initialization error (this is OK for custom OTP flow):',
        error?.message
      );
      auth = null;
    }
  } else {
    console.warn(
      'Firebase Auth not initialized - API key or auth domain missing (expected for custom OTP flow)'
    );
  }
} else {
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
      console.warn('Firebase Auth initialization error:', error?.message);
      auth = null;
    }
  }
}

export { app, firestore, database, auth };
export default app;


