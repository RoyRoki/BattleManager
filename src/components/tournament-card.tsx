import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Tournament, TournamentStatus } from '../types';
import { EnrollButton } from './enroll-button';
import { useCountdown } from '../hooks/useCountdown';

interface TournamentCardProps {
  tournament: Tournament;
  onEnrollSuccess?: () => void;
}

// Compute effective status based on start_time
const getEffectiveStatus = (tournament: Tournament): TournamentStatus => {
  // If manually set to completed or cancelled, respect that
  if (tournament.status === 'completed' || tournament.status === 'cancelled') {
    return tournament.status;
  }
  
  // If start_time has passed and status is upcoming, show as live
  if (tournament.status === 'upcoming' && tournament.start_time) {
    const now = new Date();
    if (now >= new Date(tournament.start_time)) {
      return 'live';
    }
  }
  
  return tournament.status;
};

// Format status text in a user-friendly way
const formatStatusText = (status: TournamentStatus): string => {
  switch (status) {
    case 'live':
      return 'Live Now';
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      // TypeScript exhaustiveness check - this should never happen
      return String(status);
  }
};

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onEnrollSuccess }) => {
  const progress = (tournament.current_players / tournament.max_players) * 100;
  const isFull = tournament.current_players >= tournament.max_players;
  const effectiveStatus = getEffectiveStatus(tournament);
  const countdown = useCountdown(tournament.start_time);
  
  // Check if enrollment is allowed (status must be upcoming and start_time hasn't passed)
  const enrollmentAllowed = tournament.status === 'upcoming' && 
    (tournament.start_time ? !countdown.isExpired : true);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on the enroll button or its container
    const target = e.target as HTMLElement;
    if (target.closest('.enroll-button-container') || target.closest('button')) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="bg-bg-secondary border border-gray-800 rounded-lg overflow-hidden hover:border-primary transition">
      <Link to={`/tournament/${tournament.id}`} onClick={handleCardClick}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4"
        >
          <h3 className="text-lg font-heading text-primary mb-3">{tournament.name}</h3>

          {/* Horizontal Three-Column Layout */}
          <div className="flex items-center border-t border-b border-gray-700 py-4 mb-3">
            {/* Left Column: Date and Time */}
            <div className="flex-1 flex flex-col items-center text-center border-r border-gray-700 pr-4">
              <div className="text-white text-sm font-body space-y-0.5">
                <div>{new Date(tournament.start_time).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</div>
                <div>{new Date(tournament.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
              </div>
            </div>

            {/* Middle Column: Entry Fee */}
            <div className="flex-1 flex flex-col items-center text-center border-r border-gray-700 px-4">
              <div className="text-white text-sm mb-1">Entry Fee</div>
              <div className="text-white text-lg font-heading">{tournament.entry_amount} Points</div>
            </div>

            {/* Right Column: Per Kill Rewards */}
            <div className="flex-1 flex flex-col items-center text-center pl-4">
              <div className="text-white text-sm mb-1">Per Kill</div>
              <div className="text-white text-lg font-heading">
                {tournament.per_kill_point || 0} Points
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{tournament.current_players} of {tournament.max_players} Players</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${
                  isFull ? 'bg-accent' : 'bg-primary'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded font-heading ${
                  effectiveStatus === 'upcoming'
                    ? 'bg-orange-900 text-orange-300'
                    : effectiveStatus === 'live'
                    ? 'bg-green-900 text-green-300 animate-pulse'
                    : effectiveStatus === 'completed'
                    ? 'bg-blue-900 text-blue-300'
                    : effectiveStatus === 'cancelled'
                    ? 'bg-red-900 text-red-300'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {formatStatusText(effectiveStatus)}
              </span>
              {/* Countdown Label */}
              {countdown.showLabel && enrollmentAllowed && (
                <span className="text-xs px-2 py-1 bg-orange-600/30 border border-orange-500 rounded text-orange-300 font-heading animate-pulse">
                  ⏰ {countdown.showLabel}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </Link>

      <div className="enroll-button-container px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <EnrollButton 
          tournament={tournament} 
          onEnrollSuccess={onEnrollSuccess}
        />
      </div>
    </div>
  );
};


