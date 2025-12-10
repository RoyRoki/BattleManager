#!/usr/bin/env node

/**
 * Clear Database Script
 * 
 * This script clears all data from Firestore collections and Realtime Database
 * to prepare for production.
 * 
 * WARNING: This will delete ALL data from the following:
 * 
 * Firestore Collections:
 * - users
 * - tournaments
 * - payments
 * - notifications
 * - banners
 * 
 * Realtime Database:
 * - global_chat (all chat messages)
 * - support_chats (all support chat messages)
 * 
 * It will preserve:
 * - admins (Firebase Auth users with admin role)
 * - settings (optional - can be cleared with --clear-settings flag)
 * 
 * Prerequisites:
 * 1. serviceAccountKey.json must exist in the project root
 * 
 * Usage:
 *   node scripts/clear-database.js [--clear-settings] [--confirm] [--database-url URL]
 * 
 * Options:
 *   --clear-settings    Also clear the settings collection
 *   --confirm           Skip confirmation prompt (use with caution)
 *   --database-url URL  Specify Realtime Database URL (optional)
 * 
 * Example:
 *   node scripts/clear-database.js
 *   node scripts/clear-database.js --clear-settings
 *   node scripts/clear-database.js --database-url https://project-default-rtdb.region.firebasedatabase.app
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const clearSettings = args.includes('--clear-settings');
const skipConfirm = args.includes('--confirm');

// Collections to clear
const collectionsToClear = [
  'users',
  'tournaments',
  'payments',
  'notifications',
  'banners',
];

if (clearSettings) {
  collectionsToClear.push('settings');
}

// Initialize Firebase Admin
const serviceAccountPath = path.join(projectRoot, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ Error: serviceAccountKey.json not found!');
  console.error('\nTo get your service account key:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save it as "serviceAccountKey.json" in the project root\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Get database URL from command line, environment, or .env file
let databaseURL = null;

// Check for --database-url argument
const dbUrlIndex = args.indexOf('--database-url');
if (dbUrlIndex !== -1 && args[dbUrlIndex + 1]) {
  databaseURL = args[dbUrlIndex + 1];
}

// If not in args, try environment variables
if (!databaseURL) {
  databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
}

// If still not found, try reading from .env file
if (!databaseURL) {
  const envPath = path.join(projectRoot, '.env');
  const envLocalPath = path.join(projectRoot, '.env.local');
  
  for (const envFile of [envLocalPath, envPath]) {
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const dbUrlMatch = envContent.match(/FIREBASE_DATABASE_URL=(.+)/) || 
                        envContent.match(/VITE_FIREBASE_DATABASE_URL=(.+)/);
      if (dbUrlMatch) {
        databaseURL = dbUrlMatch[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
}

if (!admin.apps.length) {
  const appConfig = {
    credential: admin.credential.cert(serviceAccount),
  };
  
  // Only add databaseURL if we have it
  if (databaseURL) {
    appConfig.databaseURL = databaseURL;
  }
  
  admin.initializeApp(appConfig);
}

const db = admin.firestore();
let rtdb = null;

// Only initialize Realtime Database if we have the URL
if (databaseURL) {
  try {
    rtdb = admin.database();
  } catch (error) {
    console.warn('⚠️  Could not initialize Realtime Database:', error.message);
    console.warn('   Realtime Database clearing will be skipped.');
  }
} else {
  console.warn('⚠️  Database URL not found. Realtime Database clearing will be skipped.');
  console.warn('   Set FIREBASE_DATABASE_URL or VITE_FIREBASE_DATABASE_URL environment variable to enable.');
}

// Helper function to delete all documents in a Firestore collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`   ✓ ${collectionName}: Already empty`);
    return 0;
  }

  const batchSize = 500; // Firestore batch limit
  const batches = [];
  let batch = db.batch();
  let count = 0;

  snapshot.docs.forEach((doc, index) => {
    batch.delete(doc.ref);
    count++;

    if ((index + 1) % batchSize === 0) {
      batches.push(batch);
      batch = db.batch();
    }
  });

  if (count % batchSize !== 0) {
    batches.push(batch);
  }

  // Execute all batches
  for (const batchToCommit of batches) {
    await batchToCommit.commit();
  }

  console.log(`   ✓ ${collectionName}: Deleted ${count} documents`);
  return count;
}

// Helper function to delete Realtime Database path
async function deleteRealtimePath(path) {
  if (!rtdb) {
    console.log(`   ⚠ ${path}: Skipped (Database URL not configured)`);
    return 0;
  }
  
  try {
    const ref = rtdb.ref(path);
    const snapshot = await ref.once('value');
    
    if (!snapshot.exists()) {
      console.log(`   ✓ ${path}: Already empty`);
      return 0;
    }

    await ref.remove();
    const count = Object.keys(snapshot.val() || {}).length;
    console.log(`   ✓ ${path}: Deleted ${count} items`);
    return count;
  } catch (error) {
    console.error(`   ✗ ${path}: Error - ${error.message}`);
    return 0;
  }
}

// Confirmation prompt
function askConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n⚠️  WARNING: This will delete ALL data from:');
    console.log('\nFirestore Collections:');
    collectionsToClear.forEach((col) => {
      console.log(`   - ${col}`);
    });
    console.log('\nRealtime Database:');
    console.log('   - global_chat (all chat messages)');
    console.log('   - support_chats (all support chats)');
    console.log('\nThis action CANNOT be undone!');
    console.log('\nPreserved:');
    console.log('   - Admin users (Firebase Auth)');
    if (!clearSettings) {
      console.log('   - Settings collection');
    }

    rl.question('\nType "CLEAR" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'CLEAR');
    });
  });
}

// Main function
async function clearDatabase() {
  try {
    console.log('\n🗑️  Database Clear Script');
    console.log('========================\n');

    // Confirmation
    if (!skipConfirm) {
      const confirmed = await askConfirmation();
      if (!confirmed) {
        console.log('\n❌ Operation cancelled.\n');
        process.exit(0);
      }
    }

    console.log('\n🔄 Starting database clear...\n');

    let totalDeleted = 0;

    // Clear Firestore collections
    console.log('📦 Clearing Firestore collections...\n');
    for (const collectionName of collectionsToClear) {
      try {
        const count = await deleteCollection(collectionName);
        totalDeleted += count;
      } catch (error) {
        console.error(`   ✗ ${collectionName}: Error - ${error.message}`);
      }
    }

    // Clear Realtime Database paths (if configured)
    if (rtdb) {
      console.log('\n💬 Clearing Realtime Database...\n');
      const rtdbPaths = ['global_chat', 'support_chats'];
      for (const path of rtdbPaths) {
        try {
          const count = await deleteRealtimePath(path);
          totalDeleted += count;
        } catch (error) {
          console.error(`   ✗ ${path}: Error - ${error.message}`);
        }
      }
    } else {
      console.log('\n💬 Skipping Realtime Database (URL not configured)\n');
    }

    console.log('\n✅ Database clear completed!');
    console.log(`   Total documents deleted: ${totalDeleted}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Verify the database is empty in Firebase Console');
    console.log('   2. Set up your admin user: node scripts/setup-admin.js <email>');
    if (clearSettings) {
      console.log('   3. Configure settings in the admin panel');
    }
    console.log('   4. Ready for production! 🚀\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error clearing database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
clearDatabase();

