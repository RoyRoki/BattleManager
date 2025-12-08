import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiLockClosed, HiMail, HiKey } from 'react-icons/hi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../../shared/utils/errorHandler';

export const AdminLoginPage: React.FC = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail || !adminPassword) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await adminLogin(adminEmail, adminPassword);
      toast.success('Admin login successful!');
      navigate(ROUTES.ADMIN_DASHBOARD);
    } catch (error: any) {
      const friendlyError = getUserFriendlyError(error, undefined, 'Invalid admin credentials. Please check your email and password.');
      toast.error(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-bg-secondary border border-primary rounded-lg p-8 max-w-md w-full shadow-lg"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading text-primary mb-2 text-glow">
            Admin Login
          </h1>
          <p className="text-gray-400 font-body">Access the BattleManager Admin Panel</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-body text-gray-300 mb-2">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiMail className="text-gray-400" />
              </div>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-body text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiLockClosed className="text-gray-400" />
              </div>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-bg border border-gray-700 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition font-body"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-bg py-3 rounded-lg font-body hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <HiKey className="w-5 h-5" />
                Login as Admin
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

