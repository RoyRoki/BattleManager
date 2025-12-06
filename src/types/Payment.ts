export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Payment {
  id: string;
  user_mobile: string;
  amount: number;
  upi_id?: string;
  proof_url: string;
  status: PaymentStatus;
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


