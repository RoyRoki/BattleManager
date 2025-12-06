import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { Tournament, TournamentStatus } from '../types';
import { EnrollButton } from '../components/enroll-button';
import { motion } from 'framer-motion';
import { decryptCredentials } from '../utils/encryptCredentials';
import { useAuth } from '../contexts/AuthContext';
import { HiArrowLeft } from 'react-icons/hi';

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

export const TournamentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournamentDoc, loading, error] = useDocument(
    id ? doc(firestore, 'tournaments', id) : null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-primary text-xl font-heading">Loading tournament...</div>
      </div>
    );
  }

  if (error || !tournamentDoc?.exists()) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <div className="text-accent text-xl font-heading">Tournament not found</div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-bg-secondary border border-gray-800 hover:border-primary px-4 py-2 rounded-lg transition-colors"
        >
          <HiArrowLeft className="text-primary" />
          <span className="text-primary">Go Home</span>
        </button>
      </div>
    );
  }

  const data = tournamentDoc.data();
  const tournament = {
    id: tournamentDoc.id,
    ...data,
    start_time:
      data.start_time instanceof Date
        ? data.start_time
        : (data.start_time as any)?.toDate?.() || new Date(),
    reveal_time:
      data.reveal_time instanceof Date
        ? data.reveal_time
        : (data.reveal_time as any)?.toDate?.() || undefined,
    created_at:
      data.created_at instanceof Date
        ? data.created_at
        : (data.created_at as any)?.toDate?.() || new Date(),
    updated_at:
      data.updated_at instanceof Date
        ? data.updated_at
        : (data.updated_at as any)?.toDate?.() || new Date(),
  } as Tournament;

  const effectiveStatus = getEffectiveStatus(tournament);

  const canViewCredentials =
    user &&
    user.enrolled_tournaments.includes(tournament.id) &&
    tournament.reveal_time &&
    new Date() >= tournament.reveal_time;

  let credentials = null;
  if (canViewCredentials && tournament.encrypted_credentials) {
    try {
      credentials = decryptCredentials(tournament.encrypted_credentials);
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button with Page Title */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors"
            aria-label="Go back"
          >
            <HiArrowLeft className="text-xl text-primary" />
          </button>
          <h1 className="text-xl font-heading text-primary">Tournament Details</h1>
        </motion.div>

        {tournament.banner_url && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={tournament.banner_url}
            alt={tournament.name}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary border border-gray-800 rounded-lg p-6 mb-6"
        >
          <h1 className="text-3xl font-heading text-primary mb-4">{tournament.name}</h1>
          {tournament.description && (
            <p className="text-gray-300 mb-4">{tournament.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-bg rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Entry Fee</p>
              <p className="text-xl font-heading text-primary">{tournament.entry_amount} pts</p>
            </div>
            <div className="bg-bg rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Players</p>
              <p className="text-xl font-heading text-primary">
                {tournament.current_players}/{tournament.max_players}
              </p>
            </div>
            <div className="bg-bg rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Start Time</p>
              <p className="text-sm text-white">
                {new Date(tournament.start_time).toLocaleString()}
              </p>
            </div>
            <div className="bg-bg rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <p
                className={`text-sm uppercase font-heading ${
                  effectiveStatus === 'upcoming'
                    ? 'text-orange-300'
                    : effectiveStatus === 'live'
                    ? 'text-green-300'
                    : effectiveStatus === 'completed'
                    ? 'text-blue-300'
                    : effectiveStatus === 'cancelled'
                    ? 'text-red-300'
                    : 'text-gray-400'
                }`}
              >
                {effectiveStatus}
              </p>
            </div>
          </div>

          {tournament.status === 'cancelled' && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-300 font-heading">This tournament has been cancelled</p>
            </div>
          )}

          {tournament.status === 'completed' && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-blue-300 font-heading">This tournament has been completed</p>
            </div>
          )}

          {canViewCredentials && credentials && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-bg border border-primary rounded-lg p-4 mb-6"
            >
              <h3 className="text-lg font-heading text-primary mb-2">Tournament Credentials</h3>
              <p className="text-white font-mono break-all">{credentials}</p>
            </motion.div>
          )}

          {tournament.reveal_time && new Date() < tournament.reveal_time && (
            <div className="bg-bg-tertiary border border-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400">
                Credentials will be revealed on:{' '}
                {new Date(tournament.reveal_time).toLocaleString()}
              </p>
            </div>
          )}

          <EnrollButton tournament={tournament} />
        </motion.div>
      </div>
    </div>
  );
};


