import React from 'react';
import { motion } from 'framer-motion';
import { useEnrollTournament } from '../hooks/useEnrollTournament';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { Tournament, TournamentStatus } from '../types';
// import { Howl } from 'howler'; // TODO: Add sound files

interface EnrollButtonProps {
  tournament: Tournament;
  onEnrollSuccess?: () => void;
}

// Gunshot sound effect
const playEnrollSound = () => {
  // In production, load actual sound file
  // const sound = new Howl({ src: ['/sounds/gunshot.mp3'] });
  // sound.play();
};

// Compute effective status based on reveal_time
const getEffectiveStatus = (tournament: Tournament): TournamentStatus => {
  if (tournament.status === 'completed' || tournament.status === 'cancelled') {
    return tournament.status;
  }
  if (tournament.status === 'upcoming' && tournament.reveal_time) {
    const now = new Date();
    if (now >= new Date(tournament.reveal_time)) {
      return 'live';
    }
  }
  return tournament.status;
};

export const EnrollButton: React.FC<EnrollButtonProps> = ({
  tournament,
  onEnrollSuccess,
}) => {
  const { user } = useAuth();
  const { points } = usePoints();
  const { enroll, isEnrolling } = useEnrollTournament();
  const effectiveStatus = getEffectiveStatus(tournament);

  const handleEnroll = async () => {
    if (!user) {
      return;
    }

    const success = await enroll(tournament);
    if (success) {
      playEnrollSound();
      onEnrollSuccess?.();
    }
  };

  const canEnroll =
    user &&
    points >= tournament.entry_amount &&
    !user.enrolled_tournaments.includes(tournament.id) &&
    tournament.current_players < tournament.max_players &&
    (effectiveStatus === 'upcoming' || effectiveStatus === 'live');

  return (
    <motion.button
      whileHover={{ scale: canEnroll ? 1.05 : 1 }}
      whileTap={{ scale: canEnroll ? 0.95 : 1 }}
      onClick={handleEnroll}
      disabled={!canEnroll || isEnrolling}
      className={`w-full py-3 rounded-lg font-heading text-lg transition ${
        canEnroll
          ? 'bg-primary text-bg hover:bg-opacity-90'
          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
      }`}
    >
      {isEnrolling
        ? 'Enrolling...'
        : !user
        ? 'Login to Enroll'
        : effectiveStatus === 'completed'
        ? 'Tournament Completed'
        : effectiveStatus === 'cancelled'
        ? 'Tournament Cancelled'
        : points < tournament.entry_amount
        ? 'Insufficient Points'
        : user.enrolled_tournaments.includes(tournament.id)
        ? 'Already Enrolled'
        : tournament.current_players >= tournament.max_players
        ? 'Tournament Full'
        : effectiveStatus === 'live'
        ? 'Join Live Tournament'
        : 'Enroll Now'}
    </motion.button>
  );
};


