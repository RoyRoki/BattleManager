import { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { useFirestoreTransaction } from './useFirestoreTransaction';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { Tournament } from '../types';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../shared/utils/errorHandler';

export const useEnrollTournament = () => {
  const { user } = useAuth();
  const { points } = usePoints();
  const { deductPoints } = useFirestoreTransaction();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const enroll = async (tournament: Tournament): Promise<boolean> => {
    if (!user) {
      toast.error('Please login to enroll');
      return false;
    }

    if (points < tournament.entry_amount) {
      toast.error('Insufficient points');
      return false;
    }

    if (user.enrolled_tournaments.includes(tournament.id)) {
      toast.error('Already enrolled in this tournament');
      return false;
    }

    if (tournament.current_players >= tournament.max_players) {
      toast.error('Tournament is full');
      return false;
    }

    // Check if tournament status is upcoming
    if (tournament.status !== 'upcoming') {
      toast.error('Tournament is not available for enrollment');
      return false;
    }

    // Check if start_time has passed - if so, prevent enrollment
    if (tournament.start_time) {
      const now = new Date();
      const startTime = new Date(tournament.start_time);
      if (now >= startTime) {
        toast.error('Tournament has already started. Enrollment is closed.');
        return false;
      }
    }

    setIsEnrolling(true);

    try {
      // Normalize email for Firestore lookup
      const normalizedEmail = user.email.toLowerCase().trim();
      
      // Deduct points using transaction
      const pointsDeducted = await deductPoints(normalizedEmail, tournament.entry_amount);

      if (!pointsDeducted) {
        toast.error('Failed to deduct points');
        return false;
      }

      // Update tournament enrollment
      const tournamentRef = doc(firestore, 'tournaments', tournament.id);
      await updateDoc(tournamentRef, {
        current_players: tournament.current_players + 1,
        updated_at: new Date(),
      });

      // Update user enrolled tournaments
      const userRef = doc(firestore, 'users', normalizedEmail);
      await updateDoc(userRef, {
        enrolled_tournaments: arrayUnion(tournament.id),
        updated_at: new Date(),
      });

      toast.success('Successfully enrolled in tournament!');
      return true;
    } catch (error: any) {
      console.error('Enrollment error:', error);
      const friendlyError = getUserFriendlyError(error, 'tournament', 'Failed to enroll in tournament. Please try again.');
      toast.error(friendlyError);
      return false;
    } finally {
      setIsEnrolling(false);
    }
  };

  return {
    enroll,
    isEnrolling,
  };
};


