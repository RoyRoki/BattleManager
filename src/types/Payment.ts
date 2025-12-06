export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentType = 'add_money' | 'withdrawal';

export interface Payment {
  id: string;
  user_mobile: string;
  user_name?: string;
  amount: number;
  type?: PaymentType; // 'add_money' or 'withdrawal'
  upi_id?: string;
  bank_account_no?: string;
  ifsc_code?: string;
  proof_url?: string;
  status: PaymentStatus;
  commission_amount?: number; // Commission deducted for withdrawals
  final_amount?: number; // Final amount after commission deduction
  approved_by?: string; // Admin email
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
  notes?: string;
}

export interface WithdrawalRequest {
  id: string;
  user_mobile: string;
  amount: number;
  upi_id: string;
  status: PaymentStatus;
  created_at: Date;
}


