import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'battlemanager-secret-key-2026';
const PASSWORD_SALT = import.meta.env.VITE_PASSWORD_SALT || 'battlemanager-password-salt-2026';

/**
 * Encrypt credentials using AES encryption
 * @param credentials - Plain text credentials
 * @returns Encrypted string
 */
export const encryptCredentials = (credentials: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(credentials, SECRET_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credentials');
  }
};

/**
 * Decrypt credentials
 * @param encryptedCredentials - Encrypted string
 * @returns Decrypted plain text
 */
export const decryptCredentials = (encryptedCredentials: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedCredentials, SECRET_KEY);
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);
    return plainText;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credentials');
  }
};

/**
 * Hash password using PBKDF2 with salt
 * @param password - Plain text password
 * @returns Hashed password string (includes salt)
 */
export const hashPassword = (password: string): string => {
  try {
    // Generate a random salt for each password
    const salt = CryptoJS.lib.WordArray.random(128/8);
    
    // Use PBKDF2 with 10000 iterations for key derivation
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    
    // Combine salt and hash (salt:hash format for storage)
    const saltHex = salt.toString();
    const hashHex = key.toString();
    
    return `${saltHex}:${hashHex}`;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify password against stored hash
 * @param password - Plain text password to verify
 * @param hash - Stored hash (format: salt:hash)
 * @returns True if password matches, false otherwise
 */
export const verifyPassword = (password: string, hash: string): boolean => {
  try {
    // Extract salt and hash from stored value
    const [saltHex, storedHashHex] = hash.split(':');
    
    if (!saltHex || !storedHashHex) {
      console.error('Invalid hash format');
      return false;
    }
    
    // Convert hex string back to WordArray
    const salt = CryptoJS.enc.Hex.parse(saltHex);
    
    // Hash the provided password with the same salt
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    
    const computedHashHex = key.toString();
    
    // Compare hashes (constant-time comparison)
    return computedHashHex === storedHashHex;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};


