export interface User {
  mobile_no: string;
  name?: string;
  ff_id?: string; // Free Fire ID
  avatar_url?: string;
  points: number;
  enrolled_tournaments: string[];
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface UserProfile extends User {
  total_enrollments: number;
  total_winnings: number;
  payment_history: string[];
}


