import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEnrollTournament } from '../hooks/useEnrollTournament';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { Tournament, TournamentStatus } from '../types';
import { ConfirmDialog } from '../shared/components/ui/ConfirmDialog';
import { useCountdown } from '../hooks/useCountdown';
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

// Compute effective status based on reveal_time and start_time
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
  // Check if start_time has passed
  if (tournament.status === 'upcoming' && tournament.start_time) {
    const now = new Date();
    if (now >= new Date(tournament.start_time)) {
      return 'live';
    }
  }
  return tournament.status;
};

// Check if enrollment is allowed based on status and start_time
const canEnrollInTournament = (tournament: Tournament): boolean => {
  // Must be upcoming status
  if (tournament.status !== 'upcoming') {
    return false;
  }
  
  // If start_time exists and has passed, cannot enroll
  if (tournament.start_time) {
    const now = new Date();
    const startTime = new Date(tournament.start_time);
    if (now >= startTime) {
      return false;
    }
  }
  
  return true;
};

export const EnrollButton: React.FC<EnrollButtonProps> = ({
  tournament,
  onEnrollSuccess,
}) => {
  const { user } = useAuth();
  const { points } = usePoints();
  const { enroll, isEnrolling } = useEnrollTournament();
  const effectiveStatus = getEffectiveStatus(tournament);
  const countdown = useCountdown(tournament.start_time);
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

  // Check if enrollment is allowed
  const enrollmentAllowed = canEnrollInTournament(tournament);
  
  const canEnroll =
    user &&
    points >= tournament.entry_amount &&
    !user.enrolled_tournaments.includes(tournament.id) &&
    tournament.current_players < tournament.max_players &&
    enrollmentAllowed;

  // Get button text
  const getButtonText = () => {
    if (isEnrolling) return 'Enrolling...';
    if (!user) return 'Login to Enroll';
    if (effectiveStatus === 'completed') return 'Tournament Completed';
    if (effectiveStatus === 'cancelled') return 'Tournament Cancelled';
    if (!enrollmentAllowed) {
      if (countdown.isExpired) return 'Tournament Started';
      return 'Enrollment Closed';
    }
    if (points < tournament.entry_amount) return 'Insufficient Points';
    if (user.enrolled_tournaments.includes(tournament.id)) return 'Already Enrolled';
    if (tournament.current_players >= tournament.max_players) return 'Tournament Full';
    return 'Enroll Now';
  };

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
        {getButtonText()}
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


