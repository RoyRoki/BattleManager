#!/usr/bin/env node

/**
 * Admin Setup Script
 * 
 * This script sets the 'admin' custom claim on a Firebase user.
 * 
 * Prerequisites:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Get your service account key from Firebase Console:
 *    - Go to Project Settings → Service Accounts
 *    - Click "Generate new private key"
 *    - Save it as serviceAccountKey.json in the project root
 * 
 * Usage:
 *   node scripts/setup-admin.js <email>
 * 
 * Example:
 *   node scripts/setup-admin.js admin@battlemanager.com
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('\nUsage: node scripts/setup-admin.js <email>');
  console.log('Example: node scripts/setup-admin.js admin@battlemanager.com\n');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

// Try to find service account key
const projectRoot = process.cwd();
const possiblePaths = [
  path.join(projectRoot, 'serviceAccountKey.json'),
  path.join(projectRoot, 'service-account-key.json'),
  path.join(projectRoot, 'firebase-service-account.json'),
];

let serviceAccountPath = null;
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    serviceAccountPath = possiblePath;
    break;
  }
}

if (!serviceAccountPath) {
  console.error('❌ Error: Service account key not found');
  console.log('\nPlease download your service account key from Firebase Console:');
  console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save it as "serviceAccountKey.json" in the project root\n');
  process.exit(1);
}

// Initialize Firebase Admin
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountData);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

// Set admin claim
async function setupAdmin() {
  try {
    console.log(`🔍 Looking up user: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`✅ User found: ${user.email} (UID: ${user.uid})`);
    
    // Check current claims
    if (user.customClaims && user.customClaims.role === 'admin') {
      console.log('ℹ️  User already has admin role');
      console.log('   If you just set this, the user needs to sign out and sign in again.\n');
      return;
    }
    
    console.log('🔧 Setting admin custom claim...');
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    
    console.log('✅ Admin claim set successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. The user must sign out and sign in again to refresh their token');
    console.log('   2. After signing in again, they will have admin access');
    console.log(`   3. They can now access: /admin\n`);
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User with email "${email}" not found in Firebase Authentication.`);
      console.log('\nPlease create the user first:');
      console.log('1. Go to Firebase Console → Authentication → Users');
      console.log('2. Click "Add user"');
      console.log('3. Enter the email and password');
      console.log('4. Run this script again\n');
    } else {
      console.error('❌ Error:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
    }
    process.exit(1);
  }
}

// Run the setup
setupAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

