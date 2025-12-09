#!/usr/bin/env node

/**
 * Verify Admin Claim Script
 * 
 * This script verifies that a user has the admin custom claim set.
 * 
 * Usage:
 *   node scripts/verify-admin.js <email>
 * 
 * Example:
 *   node scripts/verify-admin.js rocket.7.fs@gmail.com
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('\nUsage: node scripts/verify-admin.js <email>');
  console.log('Example: node scripts/verify-admin.js rocket.7.fs@gmail.com\n');
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
  process.exit(1);
}

// Initialize Firebase Admin
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountData);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

// Verify admin claim
async function verifyAdmin() {
  try {
    console.log(`🔍 Looking up user: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`✅ User found: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email verified: ${user.emailVerified}`);
    console.log(`\n📋 Custom Claims:`);
    
    if (user.customClaims) {
      console.log(JSON.stringify(user.customClaims, null, 2));
      
      if (user.customClaims.role === 'admin') {
        console.log('\n✅ User HAS admin role!');
        console.log('\n📝 Note: If login still fails, the user must:');
        console.log('   1. Sign out completely from the app');
        console.log('   2. Sign in again to refresh the token');
        console.log('   3. The token refresh will include the new admin claim\n');
      } else {
        console.log(`\n❌ User does NOT have admin role. Current role: "${user.customClaims.role || 'none'}"`);
        console.log('\n🔧 To fix this, run:');
        console.log(`   node scripts/setup-admin.js ${email}\n`);
      }
    } else {
      console.log('   No custom claims found');
      console.log('\n❌ User does NOT have admin role.');
      console.log('\n🔧 To fix this, run:');
      console.log(`   node scripts/setup-admin.js ${email}\n`);
    }
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User with email "${email}" not found in Firebase Authentication.`);
    } else {
      console.error('❌ Error:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
    }
    process.exit(1);
  }
}

// Run the verification
verifyAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });






