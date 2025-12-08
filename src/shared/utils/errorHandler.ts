/**
 * Centralized error handling utility
 * Converts technical errors to user-friendly messages
 */

import { ZodError } from 'zod';

interface FirebaseError extends Error {
  code?: string;
}

interface APIErrorResponse {
  error?: string;
  message?: string;
  errorCode?: string;
  details?: any;
}

/**
 * Maps Firebase error codes to user-friendly messages
 */
const getFirebaseErrorMessage = (code: string, context?: string): string => {
  const codeMap: Record<string, string> = {
    'permission-denied': 'You don\'t have permission to perform this action. Please contact support if you believe this is an error.',
    'unavailable': 'Service temporarily unavailable. Please check your internet connection and try again.',
    'deadline-exceeded': 'Request timed out. Please try again.',
    'not-found': context === 'user' 
      ? 'Account not found. Please check your email and try again.'
      : 'Resource not found. Please try again.',
    'already-exists': 'This already exists. Please try a different option.',
    'failed-precondition': 'Operation cannot be completed at this time. Please try again later.',
    'out-of-range': 'Invalid value provided. Please check your input and try again.',
    'cancelled': 'Operation was cancelled. Please try again.',
    'data-loss': 'Data error occurred. Please try again.',
    'unauthenticated': 'Please login to continue.',
    'resource-exhausted': 'Service is busy. Please try again in a moment.',
    'aborted': 'Operation was aborted. Please try again.',
    'internal': 'An internal error occurred. Please try again later.',
    'invalid-argument': 'Invalid input provided. Please check your information and try again.',
  };

  return codeMap[code] || 'An unexpected error occurred. Please try again.';
};

/**
 * Extracts user-friendly message from API error response
 */
const getAPIErrorMessage = (errorResponse: APIErrorResponse | string): string => {
  if (typeof errorResponse === 'string') {
    // Check if it's a JSON string
    try {
      const parsed = JSON.parse(errorResponse);
      return getAPIErrorMessage(parsed);
    } catch {
      // Not JSON, return as-is if it looks user-friendly, otherwise generic message
      if (errorResponse.length < 100 && !errorResponse.includes('Error:') && !errorResponse.includes('at ')) {
        return errorResponse;
      }
      return 'An error occurred. Please try again.';
    }
  }

  if (typeof errorResponse === 'object' && errorResponse !== null) {
    // Check for user-friendly error message
    if (errorResponse.error && typeof errorResponse.error === 'string') {
      const errorMsg = errorResponse.error;
      // If it looks like a technical error, return generic message
      if (errorMsg.includes('BREVO API error') || 
          errorMsg.includes('Firebase') || 
          errorMsg.includes('Error:') ||
          errorMsg.includes('at ') ||
          errorMsg.length > 150) {
        // Map common technical errors to user-friendly messages
        if (errorMsg.includes('BREVO') || errorMsg.includes('email')) {
          return 'Unable to send verification code. Please try again in a moment.';
        }
        if (errorMsg.includes('Firebase') || errorMsg.includes('database')) {
          return 'Database error occurred. Please try again.';
        }
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          return 'Network error. Please check your internet connection and try again.';
        }
        return 'An error occurred. Please try again.';
      }
      return errorMsg;
    }

    if (errorResponse.message && typeof errorResponse.message === 'string') {
      const msg = errorResponse.message;
      // Check if message is user-friendly
      if (!msg.includes('Error:') && !msg.includes('at ') && msg.length < 150) {
        return msg;
      }
    }
  }

  return 'An error occurred. Please try again.';
};

/**
 * Gets user-friendly error message from various error types
 * @param error - Error object, string, or API response
 * @param context - Optional context for more specific error messages (e.g., 'user', 'tournament', 'payment')
 * @param defaultMessage - Optional default message if error cannot be parsed
 */
export const getUserFriendlyError = (
  error: unknown,
  context?: string,
  defaultMessage?: string
): string => {
  // Handle null/undefined
  if (!error) {
    return defaultMessage || 'An unexpected error occurred. Please try again.';
  }

  // Handle string errors
  if (typeof error === 'string') {
    // Check if it's a JSON string
    try {
      const parsed = JSON.parse(error);
      return getAPIErrorMessage(parsed);
    } catch {
      // Not JSON, check if it's user-friendly
      if (error.length < 100 && !error.includes('Error:') && !error.includes('at ')) {
        return error;
      }
      return defaultMessage || 'An error occurred. Please try again.';
    }
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    // Get the first error message (most relevant)
    const firstIssue = error.issues[0];
    if (firstIssue) {
      return firstIssue.message;
    }
    return defaultMessage || 'Validation failed. Please check your input.';
  }

  // Handle Error objects
  if (error instanceof Error) {
    const firebaseError = error as FirebaseError;

    // Check for Firebase error code
    if (firebaseError.code) {
      return getFirebaseErrorMessage(firebaseError.code, context);
    }

    // Check for Firebase error in message
    const firebaseCodeMatch = error.message.match(/\[code=([^\]]+)\]/);
    if (firebaseCodeMatch) {
      return getFirebaseErrorMessage(firebaseCodeMatch[1], context);
    }

    // Check for network errors
    if (error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed') ||
        error.name === 'NetworkError') {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Check for timeout errors
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }

    // Check if message is already user-friendly
    const message = error.message;
    if (message.length < 150 && 
        !message.includes('Error:') && 
        !message.includes('at ') &&
        !message.includes('FirebaseError') &&
        !message.includes('BREVO') &&
        !message.includes('Cloudinary')) {
      return message;
    }

    // Map common technical error patterns
    if (message.includes('BREVO') || message.includes('email') || message.includes('SMTP')) {
      return 'Unable to send verification code. Please try again in a moment.';
    }

    if (message.includes('Cloudinary') || message.includes('upload')) {
      if (message.includes('400') || message.includes('Invalid')) {
        return 'Invalid image file. Please upload a valid image (JPG, PNG, etc.) under 5MB.';
      }
      if (message.includes('network') || message.includes('fetch')) {
        return 'Network error while uploading. Please check your connection and try again.';
      }
      return 'Failed to upload image. Please try again.';
    }

    if (message.includes('Firebase') || message.includes('Firestore')) {
      return 'Database error occurred. Please try again.';
    }

    if (message.includes('Transaction failed') || message.includes('transaction')) {
      return 'Transaction could not be completed. Please try again.';
    }

    if (message.includes('User not found') || message.includes('user not found')) {
      return 'Account not found. Please check your email and try again.';
    }

    if (message.includes('Insufficient points') || message.includes('insufficient')) {
      return 'Insufficient points. Please add more points to continue.';
    }

    if (message.includes('OTP') || message.includes('verification')) {
      if (message.includes('expired')) {
        return 'Verification code has expired. Please request a new one.';
      }
      if (message.includes('invalid') || message.includes('incorrect')) {
        return 'Invalid verification code. Please check and try again.';
      }
      return 'Verification failed. Please try again.';
    }

    // Generic fallback for technical errors
    return defaultMessage || 'An error occurred. Please try again.';
  }

  // Handle API response objects
  if (typeof error === 'object' && error !== null) {
    const apiError = error as APIErrorResponse;
    return getAPIErrorMessage(apiError);
  }

  // Fallback
  return defaultMessage || 'An unexpected error occurred. Please try again.';
};

/**
 * Helper to check if an error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes('Failed to fetch') ||
           error.message.includes('NetworkError') ||
           error.message.includes('Network request failed') ||
           error.name === 'NetworkError';
  }
  return false;
};

/**
 * Helper to check if an error is a Firebase permission error
 */
export const isPermissionError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const firebaseError = error as FirebaseError;
    return firebaseError.code === 'permission-denied' ||
           error.message.includes('permission-denied') ||
           error.message.includes('permission');
  }
  return false;
};

