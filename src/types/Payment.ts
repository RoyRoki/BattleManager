export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentType = 'add_money' | 'withdrawal' | 'tournament_winning';

export interface Payment {
  id: string;
  user_email: string;
  user_name?: string;
  amount: number;
  type?: PaymentType; // 'add_money', 'withdrawal', or 'tournament_winning'
  upi_id?: string;
  bank_account_no?: string;
  ifsc_code?: string;
  proof_url?: string;
  status: PaymentStatus;
  commission_amount?: number; // Commission deducted for withdrawals
  final_amount?: number; // Final amount after commission deduction
  approved_by?: string; // Admin email
  approved_at?: Date;
  tournament_id?: string; // Tournament ID for tournament winnings
  tournament_name?: string; // Tournament name for display
  transaction_id?: string; // Transaction ID for iPhone manual payments
  created_at: Date;
  updated_at: Date;
  notes?: string;
}

export interface WithdrawalRequest {
  id: string;
  user_email: string;
  amount: number;
  upi_id: string;
  status: PaymentStatus;
  created_at: Date;
}


