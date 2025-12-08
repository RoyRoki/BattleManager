/**
 * Utility functions for sanitizing email addresses for use in Firebase Realtime Database paths
 * Firebase paths cannot contain: ".", "#", "$", "[", "]"
 */

/**
 * Sanitize an email address for use in Firebase Realtime Database paths
 * Replaces invalid characters with safe alternatives
 * @param email - The email address to sanitize
 * @returns A sanitized string safe for use in Firebase paths
 */
export const sanitizeEmailForPath = (email: string): string => {
  if (!email) return '';
  
  return email
    .replace(/\./g, '_DOT_')      // Replace . with _DOT_
    .replace(/#/g, '_HASH_')       // Replace # with _HASH_
    .replace(/\$/g, '_DOLLAR_')   // Replace $ with _DOLLAR_
    .replace(/\[/g, '_LBRACK_')   // Replace [ with _LBRACK_
    .replace(/\]/g, '_RBRACK_'); // Replace ] with _RBRACK_
};

/**
 * Reverse the sanitization to get the original email address
 * @param sanitized - The sanitized email string
 * @returns The original email address
 */
export const desanitizeEmailFromPath = (sanitized: string): string => {
  if (!sanitized) return '';
  
  return sanitized
    .replace(/_RBRACK_/g, ']')    // Replace _RBRACK_ with ]
    .replace(/_LBRACK_/g, '[')    // Replace _LBRACK_ with [
    .replace(/_DOLLAR_/g, '$')    // Replace _DOLLAR_ with $
    .replace(/_HASH_/g, '#')      // Replace _HASH_ with #
    .replace(/_DOT_/g, '.');       // Replace _DOT_ with .
};



