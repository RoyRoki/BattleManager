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
import { HiCalendar } from 'react-icons/hi';

export const HomePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  
  // Query tournaments - filter server-side, sort client-side to avoid index requirement
  const [tournaments, loading, error] = useCollection(
    query(
      collection(firestore, 'tournaments'),
      where('status', 'in', ['upcoming', 'live'])
    )
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];

  // Query banners - filter active banners server-side
  const [banners, bannersLoading, bannersError] = useCollection(
    query(
      collection(firestore, 'banners'),
      where('is_active', '==', true)
    )
  );

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
          <div className="text-primary text-xl font-heading">Loading tournaments...</div>
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
              <div className="text-accent text-xl font-heading mb-2">Error loading tournaments</div>
              <p className="text-gray-400">Please try again later</p>
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

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-heading text-primary mb-6 text-glow"
        >
          Free Fire Tournaments
        </motion.h1>

        {tournaments && tournaments.docs.length > 0 ? (
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
              .sort((a, b) => a.start_time.getTime() - b.start_time.getTime()) // Sort client-side
              .map((tournament, index: number) => (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TournamentCard tournament={tournament} />
                </motion.div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 bg-bg-secondary border-2 border-primary/20 rounded-full flex items-center justify-center">
                <HiCalendar className="w-10 h-10 text-primary/60" />
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


