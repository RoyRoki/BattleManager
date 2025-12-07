import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Tournament, TournamentStatus } from '../types';
import { EnrollButton } from './enroll-button';

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

// Format tournament start time in a user-friendly way
const formatTournamentStartTime = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If tournament is in the past or starting very soon
  if (diffMs <= 0) {
    return 'Starting now';
  }

  // If tournament starts today
  if (diffDays === 0) {
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    }
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }

  // If tournament starts tomorrow
  if (diffDays === 1) {
    return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }

  // If tournament starts within a week
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // For dates further out, show full date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onEnrollSuccess }) => {
  const progress = (tournament.current_players / tournament.max_players) * 100;
  const isFull = tournament.current_players >= tournament.max_players;
  const effectiveStatus = getEffectiveStatus(tournament);

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

          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Entry Fee:</span>
              <span className="text-white font-body">{tournament.entry_amount} Points</span>
            </div>
            {tournament.per_kill_point && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Kill Reward:</span>
                <span className="text-white font-body">{tournament.per_kill_point} Points</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Starts:</span>
              <span className="text-white font-body">
                {formatTournamentStartTime(new Date(tournament.start_time))}
              </span>
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


