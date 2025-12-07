import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocument, useCollection } from 'react-firebase-hooks/firestore';
import { doc, collection } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { Tournament, TournamentStatus } from '../types';
import { EnrollButton } from '../components/enroll-button';
import { motion } from 'framer-motion';
import { decryptCredentials } from '../utils/encryptCredentials';
import { useAuth } from '../contexts/AuthContext';
import { HiArrowLeft, HiFire, HiClipboardCopy, HiLockClosed, HiLockOpen, HiEye, HiEyeOff } from 'react-icons/hi';
import toast from 'react-hot-toast';

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
  const [showPassword, setShowPassword] = useState(false);
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

  // Decrypt credentials if user can view them
  let ffId = null;
  let ffPassword = null;
  
  if (canViewCredentials) {
    if (tournament.ff_id_encrypted) {
      try {
        ffId = decryptCredentials(tournament.ff_id_encrypted);
      } catch (error) {
        console.error('Failed to decrypt FF-ID:', error);
      }
    }
    if (tournament.ff_password_encrypted) {
      try {
        ffPassword = decryptCredentials(tournament.ff_password_encrypted);
      } catch (error) {
        console.error('Failed to decrypt FF-Password:', error);
      }
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary border border-gray-800 rounded-lg p-6 mb-6"
        >
          <h1 className="text-3xl font-heading text-primary mb-4">{tournament.name}</h1>

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

          {/* Kill Leaderboard for completed tournaments */}
          {effectiveStatus === 'completed' && tournament.player_kills && Object.keys(tournament.player_kills).length > 0 && (
            <KillLeaderboard tournament={tournament} currentUserMobile={user?.mobile_no} />
          )}

          {/* Credentials Section */}
          {canViewCredentials && (ffId || ffPassword) ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg border border-primary rounded-lg p-4 mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <HiLockOpen className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-heading text-primary">Tournament Credentials</h3>
              </div>
              
              <div className="space-y-3">
                {ffId && (
                  <div className="bg-bg-secondary rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-gray-400">FF-ID</label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(ffId);
                          toast.success('FF-ID copied to clipboard!');
                        }}
                        className="text-primary hover:text-opacity-80 transition"
                        title="Copy FF-ID"
                      >
                        <HiClipboardCopy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-white font-mono text-sm break-all">{ffId}</p>
                  </div>
                )}
                
                {ffPassword && (
                  <div className="bg-bg-secondary rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-gray-400">FF-Password</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-white transition"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(ffPassword);
                            toast.success('FF-Password copied to clipboard!');
                          }}
                          className="text-primary hover:text-opacity-80 transition"
                          title="Copy FF-Password"
                        >
                          <HiClipboardCopy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-white font-mono text-sm break-all">
                      {showPassword ? ffPassword : '•'.repeat(ffPassword.length)}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : !user ? (
            <div className="bg-bg-tertiary border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <HiLockClosed className="w-5 h-5 text-gray-500" />
                <p className="text-sm text-gray-400">Login and enroll to view credentials</p>
              </div>
            </div>
          ) : !user.enrolled_tournaments.includes(tournament.id) ? (
            <div className="bg-bg-tertiary border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <HiLockClosed className="w-5 h-5 text-gray-500" />
                <p className="text-sm text-gray-400">Enroll in this tournament to view credentials</p>
              </div>
            </div>
          ) : tournament.reveal_time && new Date() < tournament.reveal_time ? (
            <div className="bg-bg-tertiary border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <HiLockClosed className="w-5 h-5 text-gray-500" />
                <p className="text-sm text-gray-400">
                  Credentials will be revealed on:{' '}
                  <span className="text-primary">{new Date(tournament.reveal_time).toLocaleString()}</span>
                </p>
              </div>
            </div>
          ) : null}

          <EnrollButton 
            tournament={tournament} 
            onEnrollSuccess={() => {
              // Refresh the page to show updated enrollment status
              window.location.reload();
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

// Kill Leaderboard Component
interface KillLeaderboardProps {
  tournament: Tournament;
  currentUserMobile?: string;
}

const KillLeaderboard: React.FC<KillLeaderboardProps> = ({ tournament, currentUserMobile }) => {
  const [usersSnapshot] = useCollection(collection(firestore, 'users'));

  const leaderboard = useMemo(() => {
    if (!tournament.player_kills || !usersSnapshot?.docs) return [];

    const userMap = new Map<string, { name: string; ff_id: string }>();
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      userMap.set(data.mobile_no, {
        name: data.name || 'Unknown',
        ff_id: data.ff_id || 'N/A',
      });
    });

    const pointsPerKill = tournament.payment_info?.points_per_kill || 10;

    return Object.entries(tournament.player_kills)
      .map(([mobile, data]) => {
        // Calculate winning points: use custom credit if available, otherwise kills * points_per_kill
        const customCredit = tournament.payment_info?.custom_credits?.[mobile];
        const winningPoints = customCredit || (data.kills * pointsPerKill);
        
        return {
          mobile,
          kills: data.kills,
          winningPoints,
          ...userMap.get(mobile),
        };
      })
      .sort((a, b) => b.kills - a.kills);
  }, [tournament.player_kills, tournament.payment_info, usersSnapshot]);

  if (leaderboard.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg border border-orange-500/50 rounded-lg p-4 mb-6"
    >
      <h3 className="text-lg font-heading text-orange-400 mb-4 flex items-center gap-2">
        <HiFire className="w-5 h-5" />
        Kill Leaderboard
      </h3>
      <div className="space-y-2">
        {leaderboard.map((player, index) => {
          const isCurrentUser = player.mobile === currentUserMobile;
          return (
            <motion.div
              key={player.mobile}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isCurrentUser
                  ? 'bg-orange-900/30 border border-orange-500'
                  : 'bg-bg-secondary'
              }`}
            >
              {/* Rank Badge */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-heading flex-shrink-0 ${
                  index === 0
                    ? 'bg-yellow-500 text-black'
                    : index === 1
                    ? 'bg-gray-400 text-black'
                    : index === 2
                    ? 'bg-orange-700 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {index + 1}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-heading truncate ${isCurrentUser ? 'text-orange-300' : 'text-white'}`}>
                  {player.name || 'Unknown'}
                  {isCurrentUser && <span className="text-xs ml-2">(You)</span>}
                </p>
                <p className="text-xs text-gray-500">FF ID: {player.ff_id || 'N/A'}</p>
              </div>

              {/* Winning Points */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-heading text-green-400">{player.winningPoints} pts</p>
                <p className="text-xs text-gray-500">{player.kills} kills</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
