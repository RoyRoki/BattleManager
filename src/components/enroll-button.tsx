import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEnrollTournament } from '../hooks/useEnrollTournament';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { Tournament, TournamentStatus } from '../types';
import { ConfirmDialog } from '../shared/components/ui/ConfirmDialog';
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger' | 'success';
    onConfirm: () => void;
  } | null>(null);

  const handleEnrollClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't show dialog if button is disabled
    if (!canEnroll || isEnrolling) {
      return;
    }

    // Show confirmation dialog
    const tournamentType = effectiveStatus === 'live' ? 'live tournament' : 'tournament';
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to join "${tournament.name}"? ${tournament.entry_amount} points will be deducted from your account.`,
      title: `Join ${tournamentType.charAt(0).toUpperCase() + tournamentType.slice(1)}`,
      confirmText: effectiveStatus === 'live' ? 'Join Live' : 'Enroll',
      cancelText: 'Cancel',
      confirmVariant: 'success',
      onConfirm: async () => {
        setConfirmDialog(null);
        const success = await enroll(tournament);
        if (success) {
          playEnrollSound();
          // Add a small delay to ensure enrollment completes before reload
          setTimeout(() => {
            onEnrollSuccess?.();
          }, 500);
        }
      },
    });
  };

  const canEnroll =
    user &&
    points >= tournament.entry_amount &&
    !user.enrolled_tournaments.includes(tournament.id) &&
    tournament.current_players < tournament.max_players &&
    (effectiveStatus === 'upcoming' || effectiveStatus === 'live');

  return (
    <>
      <motion.button
        whileHover={{ scale: canEnroll ? 1.05 : 1 }}
        whileTap={{ scale: canEnroll ? 0.95 : 1 }}
        onClick={handleEnrollClick}
        onMouseDown={(e) => e.stopPropagation()}
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

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmVariant={confirmDialog.confirmVariant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
};


