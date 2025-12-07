import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../../../utils/constants';

export const AppHeader: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-bg-secondary border-b border-gray-800 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-0">
          {/* App Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <img
                src="/applogo.png"
                alt="BattleManager Logo"
                className="w-10 h-10 rounded-lg object-contain"
              />
              <span className="text-xl font-heading font-bold text-primary text-glow">
                BattleManager
              </span>
            </motion.div>
          </Link>
        </div>
      </div>
    </header>
  );
};

