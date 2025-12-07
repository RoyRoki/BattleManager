export interface User {
  email: string;
  name?: string;
  avatar_url?: string;
  points: number;
  enrolled_tournaments: string[];
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  password_hash?: string; // Hashed password stored in Firestore
}

export interface UserProfile extends User {
  total_enrollments: number;
  total_winnings: number;
  payment_history: string[];
}


