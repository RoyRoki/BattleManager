export interface User {
  mobile_no: string;
  name?: string;
  ff_id?: string;
  avatar_url?: string;
  points: number;
  enrolled_tournaments: string[];
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface SignupData {
  name: string;
  ff_id: string;
  mobileNumber: string;
}

