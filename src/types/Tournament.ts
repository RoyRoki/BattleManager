export type TournamentStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export interface PlayerKill {
  kills: number;
  updated_at: Date;
  points_credited?: number; // Points credited for this player
  credited_at?: Date; // When points were credited
}

export interface TournamentPayment {
  points_per_kill: number; // Points awarded per kill
  total_paid: number; // Total points paid out
  paid_at: Date; // When payment was made
  paid_by: string; // Admin email who made the payment
  custom_credits?: Record<string, number>; // email -> custom points
}

export interface Tournament {
  id: string;
  name: string;
  entry_amount: number;
  max_players: number;
  current_players: number;
  start_time: Date;
  reveal_time?: Date; // Kept for backward compatibility, but no longer actively used
  status: TournamentStatus;
  per_kill_point?: number; // Points awarded per kill
  encrypted_credentials?: string; // Legacy field - kept for backward compatibility
  ff_id_encrypted?: string;
  ff_password_encrypted?: string;
  player_kills?: Record<string, PlayerKill>; // email -> PlayerKill
  payment_info?: TournamentPayment; // Payment tracking
  created_at: Date;
  updated_at: Date;
  created_by: string; // Admin email
}

export interface TournamentEnrollment {
  tournament_id: string;
  user_email: string;
  enrolled_at: Date;
  points_deducted: number;
}


