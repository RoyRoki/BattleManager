import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { TournamentCard } from '../components/tournament-card';
import { Tournament } from '../types';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiCalendar } from 'react-icons/hi';
import { ROUTES } from '../utils/constants';

export const TournamentHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  // Query all completed tournaments (sort client-side)
  const [completedTournaments, loading] = useCollection(
    query(
      collection(firestore, 'tournaments'),
      where('status', '==', 'completed')
    )
  ) as unknown as [{ docs: any[] } | null, boolean];

  // Query cancelled tournaments (sort client-side)
  const [cancelledTournaments] = useCollection(
    query(
      collection(firestore, 'tournaments'),
      where('status', '==', 'cancelled')
    )
  ) as unknown as [{ docs: any[] } | null, boolean];

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-primary text-xl font-heading">Loading tournament history...</div>
        </div>
      </div>
    );
  }

  const allCompleted = completedTournaments?.docs
    .map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
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
    })
    .sort((a, b) => b.start_time.getTime() - a.start_time.getTime()) || [];

  const allCancelled = cancelledTournaments?.docs
    .map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
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
    })
    .sort((a, b) => b.start_time.getTime() - a.start_time.getTime()) || [];

  const hasHistory = allCompleted.length > 0 || allCancelled.length > 0;

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors"
            aria-label="Go back"
          >
            <HiArrowLeft className="text-xl text-primary" />
          </button>
          <h1 className="text-xl font-heading text-primary">Tournament History</h1>
        </motion.div>

        {!hasHistory ? (
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 bg-bg-secondary border-2 border-primary/20 rounded-full flex items-center justify-center">
                <HiCalendar className="w-10 h-10 text-primary/60" />
              </div>
            </div>
            <p className="text-gray-400 text-lg mb-2">No tournament history yet</p>
            <p className="text-gray-500 text-sm">Completed tournaments will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCompleted.map((tournament, index: number) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TournamentCard tournament={tournament} />
              </motion.div>
            ))}
            {allCancelled.map((tournament, index: number) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (allCompleted.length + index) * 0.05 }}
              >
                <TournamentCard tournament={tournament} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

