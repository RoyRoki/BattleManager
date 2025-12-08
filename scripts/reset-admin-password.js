#!/usr/bin/env node

/**
 * Reset Admin Password Script
 * 
 * This script resets the password for a Firebase admin user.
 * 
 * Usage:
 *   node scripts/reset-admin-password.js <email> <new-password>
 * 
 * Example:
 *   node scripts/reset-admin-password.js rocket.7.fs@gmail.com MyNewPassword123!
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Get email and password from command line
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('❌ Error: Email and password are required');
  console.log('\nUsage: node scripts/reset-admin-password.js <email> <new-password>');
  console.log('Example: node scripts/reset-admin-password.js rocket.7.fs@gmail.com MyNewPassword123!\n');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

// Validate password strength (at least 6 characters)
if (newPassword.length < 6) {
  console.error('❌ Error: Password must be at least 6 characters long');
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
  console.log('\nPlease ensure serviceAccountKey.json exists in the project root\n');
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

// Reset password
async function resetPassword() {
  try {
    console.log(`🔍 Looking up user: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`✅ User found: ${user.email} (UID: ${user.uid})`);
    console.log('🔧 Resetting password...');
    
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });
    
    console.log('✅ Password reset successfully!');
    console.log('\n📋 Next steps:');
    console.log(`   1. Use email: ${email}`);
    console.log(`   2. Use password: ${newPassword}`);
    console.log('   3. Login at /login → Admin Login\n');
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User with email "${email}" not found in Firebase Authentication.`);
      console.log('\nPlease create the user first in Firebase Console.\n');
    } else {
      console.error('❌ Error:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
    }
    process.exit(1);
  }
}

// Run the reset
resetPassword()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });




