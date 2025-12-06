import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { Banner } from '../types/Banner';

interface BannerCarouselProps {
  banners: Banner[];
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Filter only active banners and sort by order
  const activeBanners = banners.filter((banner) => banner.is_active).sort((a, b) => a.order - b.order);

  // Auto-advance carousel - pause when user interacts
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [activeBanners.length, isPaused]);

  // Reset pause after 5 seconds of no interaction
  useEffect(() => {
    if (isPaused) {
      const timer = setTimeout(() => {
        setIsPaused(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPaused]);

  if (activeBanners.length === 0) {
    return null;
  }

  const goToSlide = (index: number) => {
    setIsPaused(true);
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setIsPaused(true);
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const goToNext = () => {
    setIsPaused(true);
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50; // Minimum drag distance to trigger slide change
    const velocity = info.velocity.x;

    if (Math.abs(info.offset.x) > threshold || Math.abs(velocity) > 500) {
      setIsDragging(true);
      setIsPaused(true);
      if (info.offset.x > 0 || velocity > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
    // Reset dragging state after a short delay
    setTimeout(() => setIsDragging(false), 100);
  };

  const handleBannerClick = (banner: Banner) => {
    if (banner.tournament_id) {
      navigate(`/tournament/${banner.tournament_id}`);
    } else if (banner.link_url) {
      window.open(banner.link_url, '_blank');
    }
  };

  const currentBanner = activeBanners[currentIndex];

  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96 mb-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="relative w-full h-full cursor-pointer"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          onClick={() => {
            // Only trigger click if there was no drag
            if (!isDragging) {
              handleBannerClick(currentBanner);
            }
          }}
        >
          {/* Banner Image */}
          <div
            className="w-full h-full bg-cover bg-center relative"
            style={{ backgroundImage: `url(${currentBanner.image_url})` }}
          >
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            
            {/* Title and Subtitle - Centered alignment */}
            {(currentBanner.title || currentBanner.subtitle) && (
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex flex-col items-center justify-end text-center">
                {currentBanner.title && (
                  <h2 className="text-2xl md:text-3xl font-heading text-white mb-2 drop-shadow-lg">
                    {currentBanner.title}
                  </h2>
                )}
                {currentBanner.subtitle && (
                  <p className="text-sm md:text-base text-gray-200 font-body drop-shadow-md max-w-4xl">
                    {currentBanner.subtitle}
                  </p>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full p-2 text-white transition-all hover:scale-110 z-20"
            aria-label="Previous banner"
          >
            <HiChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full p-2 text-white transition-all hover:scale-110 z-20"
            aria-label="Next banner"
          >
            <HiChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {activeBanners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`transition-all ${
                index === currentIndex
                  ? 'w-8 h-2 bg-primary rounded-full shadow-lg shadow-primary/50'
                  : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

