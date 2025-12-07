import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePoints } from '../contexts/PointsContext';
import { OTPModal } from '../components/otp-modal';
import { motion } from 'framer-motion';
import { HiUser } from 'react-icons/hi';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { points } = usePoints();
  const [showOTPModal, setShowOTPModal] = useState(false);

  const handleLogin = (email: string) => {
    toast.success(`Logged in as ${email}`);
    setShowOTPModal(false);
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

          <button
            onClick={logout}
            className="w-full bg-accent text-white py-3 rounded-lg font-heading hover:bg-opacity-80 transition"
          >
            Logout
          </button>
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


