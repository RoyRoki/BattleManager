import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiHome, HiCurrencyDollar, HiChat, HiQuestionMarkCircle, HiUser } from 'react-icons/hi';
import { ROUTES } from '../utils/constants';

const navItems = [
  { path: ROUTES.HOME, label: 'Home', icon: HiHome },
  { path: ROUTES.MONEY, label: 'Money', icon: HiCurrencyDollar },
  { path: ROUTES.CHAT, label: 'Chat', icon: HiChat },
  { path: ROUTES.SUPPORT, label: 'Support', icon: HiQuestionMarkCircle },
  { path: ROUTES.PROFILE, label: 'Profile', icon: HiUser },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-gray-800 z-40">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-0 right-0 h-1 bg-primary"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <IconComponent
                className={`text-2xl mb-1 ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`}
              />
              <span
                className={`text-xs font-body ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};


