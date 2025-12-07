import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { firestore } from '../services/firebaseService';
import { TournamentCard } from '../components/tournament-card';
import { Tournament } from '../types';
import { Banner } from '../types/Banner';
import { useAuth } from '../contexts/AuthContext';
import { BannerCarousel } from '../components/banner-carousel';
import { motion } from 'framer-motion';
import { HiCalendar, HiClock } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

export const HomePage: React.FC = () => {
  const { isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Query only active tournaments (upcoming, live) - filter server-side to avoid loading completed tournaments
  // This ensures we only load 3 active tournaments, not 1000+ completed ones
  const [tournaments, loading, error] = useCollection(
    query(
      collection(firestore, 'tournaments'),
      where('status', 'in', ['upcoming', 'live'])
    )
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];

  // Query banners - filter active banners server-side
  // Only query if firestore is initialized
  const [banners, bannersLoading, bannersError] = useCollection(
    firestore && import.meta.env.VITE_FIREBASE_PROJECT_ID
      ? query(
          collection(firestore, 'banners'),
          where('is_active', '==', true)
        )
      : null
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];

  // Convert banners to Banner type (already filtered by is_active on server)
  // Sort by order field client-side
  const activeBanners: Banner[] =
    banners?.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          image_url: data.image_url || '',
          title: data.title,
          subtitle: data.subtitle,
          tournament_id: data.tournament_id,
          link_url: data.link_url,
          is_active: true, // Already filtered by query
          order: data.order !== undefined ? data.order : 0,
          created_at:
            data.created_at instanceof Date
              ? data.created_at
              : (data.created_at as any)?.toDate?.() || new Date(),
          updated_at:
            data.updated_at instanceof Date
              ? data.updated_at
              : (data.updated_at as any)?.toDate?.() || new Date(),
        } as Banner;
      })
      .sort((a, b) => a.order - b.order) || [];

  // Show loading state while checking auth or loading tournaments
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-primary text-xl font-heading">Loading tournaments</div>
          </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        {/* Still show banners even if tournaments fail */}
        {!bannersLoading && activeBanners.length > 0 && (
          <div className="w-full mt-16 mb-6">
            <BannerCarousel banners={activeBanners} />
          </div>
        )}

        <div className="container mx-auto px-4 py-6">

          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-accent text-xl font-heading mb-2">Unable to load tournaments</div>
              <p className="text-gray-400">Please try again in a moment</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Hero Banner Carousel - Full Width, starts right after header */}
      {activeBanners.length > 0 && (
        <div className="w-full mt-16 mb-6">
          <BannerCarousel banners={activeBanners} />
        </div>
      )}

      <div className="container mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading text-primary text-glow"
          >
            Active Tournaments
          </motion.h1>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => navigate(ROUTES.TOURNAMENT_HISTORY)}
            className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-lg transition-colors"
            title="View Past Tournaments"
          >
            <HiClock className="w-5 h-5 text-primary" />
            <span className="text-primary font-heading text-sm hidden sm:inline">Past Tournaments</span>
          </motion.button>
        </div>

        {tournaments && tournaments.docs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournaments.docs
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
                .sort((a, b) => {
                  // Sort by status priority (live first, then upcoming), then by start time
                  const statusOrder: Record<string, number> = { live: 0, upcoming: 1, completed: 2, cancelled: 3 };
                  const statusDiff = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
                  return statusDiff !== 0 ? statusDiff : a.start_time.getTime() - b.start_time.getTime();
                })
                .map((tournament, index: number) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TournamentCard 
                      tournament={tournament} 
                      onEnrollSuccess={() => {
                        // Wait a bit longer to ensure enrollment is saved, then refresh
                        setTimeout(() => {
                          window.location.reload();
                        }, 1000);
                      }}
                    />
                  </motion.div>
                ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 bg-bg-secondary border-2 border-primary/20 rounded-full flex items-center justify-center">
                <HiCalendar className="w-10 h-10 text-primary/60" />
              </div>
            </div>
            <p className="text-gray-400 text-lg mb-2">No active tournaments right now</p>
            <p className="text-gray-500 text-sm">New tournaments will appear here soon</p>
          </div>
        )}
      </div>
    </div>
  );
};


