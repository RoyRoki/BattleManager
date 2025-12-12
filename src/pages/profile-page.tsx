import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { OTPModal } from '../components/otp-modal';
import { motion } from 'framer-motion';
import { HiUser, HiShare } from 'react-icons/hi';
import { TbBrandAndroid } from 'react-icons/tb';
import toast from 'react-hot-toast';
import { useAppSettings } from '../hooks/useAppSettings';

const DEFAULT_APK_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1sWCpFTUsfhjBJnOPigZ4KbPWL8u2fKPH';

export const ProfilePage: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { points } = usePoints();
  const { apkDownloadUrl } = useAppSettings();
  const [showOTPModal, setShowOTPModal] = useState(false);

  const handleLogin = (email: string) => {
    toast.success(`Logged in as ${email}`);
    setShowOTPModal(false);
  };

  const handleShare = async () => {
    const shareUrl = 'https://battlemanager.vercel.app/';
    const shareText = '🎮 Join the ultimate Free Fire tournament platform! BattleManager - Compete, Win, Earn! 🏆';
    const shareTitle = 'BattleManager - Free Fire Tournament Platform';

    // Check if Web Share API is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully! 🎮');
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fallback to clipboard
          await copyToClipboard(shareUrl, shareText);
        }
      }
    } else {
      // Fallback for desktop browsers
      await copyToClipboard(shareUrl, shareText);
    }
  };

  const copyToClipboard = async (url: string, text: string) => {
    try {
      // Create a text with both message and URL
      const fullText = `${text}\n${url}`;
      await navigator.clipboard.writeText(fullText);
      toast.success('Link copied to clipboard! 🎯');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback: use old method for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${text}\n${url}`;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Link copied to clipboard! 🎯');
      } catch (err) {
        toast.error('Failed to copy link');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleShareAPK = async () => {
    const apkUrl = apkDownloadUrl || DEFAULT_APK_DOWNLOAD_URL;
    const shareText = '📱 Download BattleManager Android App - Join Free Fire tournaments on the go! 🎮';
    const shareTitle = 'BattleManager - Android APK Download';

    // Check if Web Share API is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: apkUrl,
        });
        toast.success('APK link shared successfully! 📱');
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing APK:', error);
          // Fallback to clipboard
          await copyToClipboard(apkUrl, shareText);
        }
      }
    } else {
      // Fallback for desktop browsers
      await copyToClipboard(apkUrl, shareText);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please login to view your profile</p>
          <button
            onClick={() => setShowOTPModal(true)}
            className="bg-primary text-bg px-6 py-3 rounded-lg font-heading hover:bg-opacity-80 transition"
          >
            Login
          </button>
          <OTPModal
            isOpen={showOTPModal}
            onClose={() => setShowOTPModal(false)}
            onSuccess={handleLogin}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary border border-primary rounded-lg p-6 mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.email}
                className="w-20 h-20 rounded-full border-2 border-primary"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-primary bg-bg-tertiary flex items-center justify-center">
                <HiUser className="text-4xl text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-heading text-primary">
                {user.name || 'User'}
              </h2>
              <p className="text-gray-400">{user.email}</p>
              {isAdmin && (
                <span className="text-xs bg-accent text-white px-2 py-1 rounded mt-1 inline-block">
                  ADMIN
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-bg border border-primary border-opacity-20 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Points</p>
              <p className="text-2xl font-heading text-primary">{points}</p>
            </div>
            <div className="bg-bg border border-primary border-opacity-20 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Tournaments</p>
              <p className="text-2xl font-heading text-primary">
                {user.enrolled_tournaments.length}
              </p>
            </div>
          </div>

          {/* Share Website Button */}
          <motion.button
            onClick={handleShare}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-bg-tertiary border-2 border-primary py-3.5 rounded-lg font-heading font-bold mb-3 relative overflow-hidden group shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
          >
            <div className="relative flex items-center justify-center gap-3 z-10">
              <HiShare className="text-xl text-primary" />
              <span className="text-base font-bold text-white">Share Website</span>
            </div>
          </motion.button>

          {/* Share APK Button */}
          <motion.button
            onClick={handleShareAPK}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-bg-tertiary border-2 border-primary py-3.5 rounded-lg font-heading font-bold mb-3 relative overflow-hidden group shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
          >
            <div className="relative flex items-center justify-center gap-3 z-10">
              <TbBrandAndroid className="text-xl text-primary" />
              <span className="text-base font-bold text-white">Share APK</span>
            </div>
          </motion.button>

          {/* Logout Button */}
          <motion.button
            onClick={logout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-bg-tertiary hover:bg-bg-secondary text-white py-3.5 rounded-lg font-heading font-bold transition-all duration-300"
          >
            Logout
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-bg-secondary border border-primary border-opacity-30 rounded-lg p-6"
        >
          <h3 className="text-xl font-heading text-primary mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Email Address:</span>
              <span className="text-white">{user.email}</span>
            </div>
            {(user as any).ff_id && (
              <div className="flex justify-between">
                <span className="text-gray-400">Free Fire ID:</span>
                <span className="text-white">{(user as any).ff_id}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Member Since:</span>
              <span className="text-white">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={user.is_active ? 'text-primary' : 'text-accent'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};


