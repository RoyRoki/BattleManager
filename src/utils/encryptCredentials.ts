import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'battlemanager-secret-key-2026';

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


