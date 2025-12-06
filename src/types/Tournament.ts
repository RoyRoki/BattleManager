export type TournamentStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  entry_amount: number;
  max_players: number;
  current_players: number;
  start_time: Date;
  reveal_time?: Date;
  status: TournamentStatus;
  banner_url?: string;
  encrypted_credentials?: string;
  created_at: Date;
  updated_at: Date;
  created_by: string; // Admin email
}

export interface TournamentEnrollment {
  tournament_id: string;
  user_mobile: string;
  enrolled_at: Date;
  points_deducted: number;
}


