export interface OTPRequest {
  email: string;
}

export interface OTPVerificationRequest {
  email: string;
  otp: string;
}

export interface OTPVerificationResponse {
  success: boolean;
  remainingAttempts?: number;
  error?: string;
}

export interface OTPState {
  attempts: number;
  isVerified: boolean;
  isLoading: boolean;
  isLoadingVerification: boolean;
}

