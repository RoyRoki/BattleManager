import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { TournamentCard } from '../components/tournament-card';
import { Tournament } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from '../features/auth/presentation/views/login-page';
import { motion } from 'framer-motion';

export const HomePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [tournaments, loading, error] = useCollection(
    query(
      collection(firestore, 'tournaments'),
      where('status', 'in', ['upcoming', 'live']),
      orderBy('start_time', 'asc')
    )
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];

  // Show login page if user is not authenticated
  if (!isLoading && !user) {
    return <LoginPage />;
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-primary text-xl font-heading">Loading tournaments...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-center">
          <div className="text-accent text-xl font-heading mb-2">Error loading tournaments</div>
          <p className="text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20 pt-20">
      <div className="container mx-auto px-4 py-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-heading text-primary mb-6 text-glow"
        >
          Free Fire Tournaments
        </motion.h1>

        {tournaments && tournaments.docs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.docs.map((doc: any, index: number) => {
              const data = doc.data();
              const tournament = {
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

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TournamentCard tournament={tournament} />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-400 text-lg mb-2">No tournaments available at the moment</p>
            <p className="text-gray-500 text-sm">Check back soon for new tournaments</p>
          </div>
        )}
      </div>
    </div>
  );
};


