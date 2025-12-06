export interface OTPRequest {
  mobileNumber: string;
}

export interface OTPVerificationRequest {
  mobileNumber: string;
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

