import { z } from 'zod';

// Mobile number validation (10 digits)
export const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid mobile number. Must be 10 digits starting with 6-9.');

// OTP validation (6 digits)
export const otpSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

// Tournament entry amount validation
export const entryAmountSchema = z
  .number()
  .min(10, 'Entry amount must be at least 10 points')
  .max(10000, 'Entry amount cannot exceed 10000 points');

// Payment amount validation
export const paymentAmountSchema = z
  .number()
  .min(100, 'Minimum payment amount is 100 points')
  .max(50000, 'Maximum payment amount is 50000 points');

// UPI ID validation
export const upiIdSchema = z
  .string()
  .regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format');

// Bank Account Number validation (9-18 digits)
export const bankAccountNoSchema = z
  .string()
  .regex(/^\d{9,18}$/, 'Bank account number must be 9-18 digits');

// IFSC Code validation (11 characters: 4 letters + 0 + 6 alphanumeric)
export const ifscCodeSchema = z
  .string()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g., ABCD0123456)')
  .transform((val) => val.toUpperCase());

// Tournament name validation
export const tournamentNameSchema = z
  .string()
  .min(3, 'Tournament name must be at least 3 characters')
  .max(100, 'Tournament name cannot exceed 100 characters');

// User name validation
export const userNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name cannot exceed 50 characters');

// Points validation
export const pointsSchema = z
  .number()
  .min(0, 'Points cannot be negative')
  .int('Points must be a whole number');

// Chat message validation
export const chatMessageSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(500, 'Message cannot exceed 500 characters');

// Free Fire ID validation (typically 6-12 characters, alphanumeric)
export const ffIdSchema = z
  .string()
  .min(6, 'Free Fire ID must be at least 6 characters')
  .max(20, 'Free Fire ID cannot exceed 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Free Fire ID can only contain letters, numbers, and underscores');

// Tournament creation schema
export const tournamentSchema = z.object({
  name: tournamentNameSchema,
  description: z.string().max(1000).optional(),
  entry_amount: entryAmountSchema,
  max_players: z.number().min(2).max(100),
  start_time: z.date(),
  reveal_time: z.date().optional(),
  banner_url: z.string().url().optional(),
});

// Payment creation schema
export const paymentSchema = z.object({
  amount: paymentAmountSchema,
  upi_id: upiIdSchema.optional(),
  proof_url: z.string().url('Invalid proof URL').optional(),
});

// Withdrawal request schema
export const withdrawalSchema = z.object({
  amount: paymentAmountSchema,
  bank_account_no: bankAccountNoSchema,
  ifsc_code: ifscCodeSchema,
});


