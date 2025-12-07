export interface User {
  email: string;
  name?: string;
  avatar_url?: string;
  points: number;
  enrolled_tournaments: string[];
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  password_hash?: string;
}

export interface SignupData {
  name: string;
  ff_id: string;
  email: string;
  password?: string;
}
