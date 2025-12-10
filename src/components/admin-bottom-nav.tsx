import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiHome,
  HiUsers,
  HiCog,
  HiBell,
  HiChartBar,
} from 'react-icons/hi';
import { MdEmojiEvents } from 'react-icons/md';
import { ROUTES } from '../utils/constants';

const adminNavItems = [
  { path: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: HiHome },
  { path: ROUTES.ADMIN_TOURNAMENTS, label: 'Tournaments', icon: MdEmojiEvents },
  { path: ROUTES.ADMIN_USERS, label: 'Users', icon: HiUsers },
  { path: ROUTES.ADMIN_ANALYTICS, label: 'Analytics', icon: HiChartBar },
  { path: ROUTES.ADMIN_SETTINGS, label: 'Settings', icon: HiCog },
];

export const AdminBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-gray-800 z-40">
      <div className="flex justify-around items-center h-16">
        {adminNavItems.map((item) => {
          // For dashboard, match exactly. For others, check if path starts with the item path
          const isActive = item.path === ROUTES.ADMIN_DASHBOARD
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="adminActiveTab"
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
                className={`text-xs font-body whitespace-nowrap ${
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

