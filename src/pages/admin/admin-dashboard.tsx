import React from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { ROUTES } from '../../utils/constants';
import { motion } from 'framer-motion';
import {
  HiUsers,
  HiCurrencyDollar,
  HiChat,
  HiUserGroup,
  HiArrowRight,
  HiChartBar,
} from 'react-icons/hi';
import { FaTrophy } from 'react-icons/fa';
import { useSupportChat } from '../../hooks/useSupportChat';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  color: 'primary' | 'accent';
  delay?: number;
  trend?: {
    value: number;
    label: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, link, color, delay = 0, trend }) => {
  return (
    <Link to={link}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.3 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`relative bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl p-6 border-2 transition-all duration-300 overflow-hidden group ${
          color === 'primary'
            ? 'border-primary hover:border-primary hover:shadow-[0_0_20px_rgba(255,186,0,0.3)]'
            : 'border-accent hover:border-accent hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]'
        }`}
      >
        {/* Animated background gradient */}
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${
            color === 'primary' ? 'bg-primary' : 'bg-accent'
          }`}
        />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div
              className={`p-3 rounded-lg border-2 bg-transparent ${
                color === 'primary'
                  ? 'border-primary text-white'
                  : 'border-accent text-white'
              }`}
            >
              <Icon className="text-2xl" />
            </div>
            {trend && (
              <div className={`text-xs px-2 py-1 rounded-full ${
                trend.value > 0 
                  ? 'bg-green-900 bg-opacity-30 text-green-300' 
                  : 'bg-red-900 bg-opacity-30 text-red-300'
              }`}>
                {trend.value > 0 ? '+' : ''}{trend.value} {trend.label}
              </div>
            )}
          </div>
          
          <p className="text-gray-400 text-sm font-body mb-2">{label}</p>
          <p
            className={`text-4xl font-heading font-bold ${
              color === 'primary' ? 'text-primary' : 'text-accent'
            }`}
          >
            {value}
          </p>
        </div>
      </motion.div>
    </Link>
  );
};

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  color: 'primary' | 'accent';
  delay?: number;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon: Icon, link, color, delay = 0 }) => {
  return (
    <Link to={link}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.3 }}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className={`relative bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl p-6 border-2 transition-all duration-300 overflow-hidden group cursor-pointer ${
          color === 'primary'
            ? 'border-primary hover:border-primary hover:shadow-[0_0_25px_rgba(255,186,0,0.4)]'
            : 'border-accent hover:border-accent hover:shadow-[0_0_25px_rgba(255,215,0,0.4)]'
        }`}
      >
        {/* Animated background gradient */}
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${
            color === 'primary' ? 'bg-primary' : 'bg-accent'
          }`}
        />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`p-3 rounded-lg border-2 bg-transparent ${
                color === 'primary'
                  ? 'border-primary text-white'
                  : 'border-accent text-white'
              }`}
            >
              <Icon className="text-2xl" />
            </div>
            <HiArrowRight
              className={`text-xl transition-transform group-hover:translate-x-1 ${
                color === 'primary' ? 'text-primary' : 'text-accent'
              }`}
            />
          </div>
          
          <h3 className={`text-xl font-heading font-bold mb-2 ${
            color === 'primary' ? 'text-primary' : 'text-accent'
          }`}>
            {title}
          </h3>
          <p className="text-gray-400 text-sm font-body flex-1">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
};

export const AdminDashboard: React.FC = () => {
  const [tournaments, tournamentsLoading, tournamentsError] = useCollection(
    collection(firestore, 'tournaments')
  );
  const [users, usersLoading, usersError] = useCollection(collection(firestore, 'users'));
  const [payments, paymentsLoading, paymentsError] = useCollection(collection(firestore, 'payments'));
  const { supportChats, isLoadingChats } = useSupportChat();

  // Check for Firestore connection errors
  if (tournamentsError || usersError || paymentsError) {
    console.error('AdminDashboard: Firestore errors:', { tournamentsError, usersError, paymentsError });
  }

  const isLoading = tournamentsLoading || usersLoading || paymentsLoading || isLoadingChats;
  const hasError = tournamentsError || usersError || paymentsError;

  // Calculate statistics
  const totalTournaments = tournaments?.docs.length || 0;
  const activeTournaments = tournaments?.docs.filter(
    (doc) => doc.data().status === 'upcoming' || doc.data().status === 'live'
  ).length || 0;
  const totalUsers = users?.docs.length || 0;
  const pendingPayments = payments?.docs.filter((doc) => doc.data().status === 'pending').length || 0;
  const supportChatCount = supportChats.length;
  const unreadSupportChats = supportChats.filter((chat) => (chat.unread_count ?? 0) > 0).length;

  const stats: StatCardProps[] = [
    {
      label: 'Total Tournaments',
      value: totalTournaments,
      icon: FaTrophy,
      link: ROUTES.ADMIN_TOURNAMENTS,
      color: 'primary',
      delay: 0.1,
      trend: {
        value: activeTournaments,
        label: 'active',
      },
    },
    {
      label: 'Total Users',
      value: totalUsers,
      icon: HiUsers,
      link: ROUTES.ADMIN_USERS,
      color: 'primary',
      delay: 0.2,
    },
    {
      label: 'Pending Payments',
      value: pendingPayments,
      icon: HiCurrencyDollar,
      link: ROUTES.ADMIN_PAYMENTS,
      color: 'accent',
      delay: 0.3,
    },
    {
      label: 'Support Chats',
      value: supportChatCount,
      icon: HiChat,
      link: ROUTES.ADMIN_SUPPORT_CHAT,
      color: 'primary',
      delay: 0.4,
      trend: unreadSupportChats > 0
        ? {
            value: unreadSupportChats,
            label: 'unread',
          }
        : undefined,
    },
  ];

  const actions: ActionCardProps[] = [
    {
      title: 'Manage Tournaments',
      description: 'Create, edit, and manage tournaments. View enrolled players and track tournament status.',
      icon: FaTrophy,
      link: ROUTES.ADMIN_TOURNAMENTS,
      color: 'primary',
      delay: 0.5,
    },
    {
      title: 'Manage Payments',
      description: 'Approve or reject payment requests. Track payment history and manage withdrawals.',
      icon: HiCurrencyDollar,
      link: ROUTES.ADMIN_PAYMENTS,
      color: 'accent',
      delay: 0.6,
    },
    {
      title: 'User Management',
      description: 'View and manage user accounts. Monitor user activity and points balance.',
      icon: HiUserGroup,
      link: ROUTES.ADMIN_USERS,
      color: 'primary',
      delay: 0.7,
    },
    {
      title: 'Support Chat',
      description: 'Respond to user support messages. Handle customer inquiries and issues.',
      icon: HiChat,
      link: ROUTES.ADMIN_SUPPORT_CHAT,
      color: 'primary',
      delay: 0.8,
    },
    {
      title: 'Analytics',
      description: 'View financial insights, transaction analytics, and revenue trends with detailed charts and graphs.',
      icon: HiChartBar,
      link: ROUTES.ADMIN_ANALYTICS,
      color: 'primary',
      delay: 0.9,
    },
  ];

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-heading text-primary mb-2 text-glow">
            Admin Dashboard
          </h1>
          <p className="text-gray-400 font-body">Manage your tournament platform</p>
        </motion.div>

        {/* Error Message */}
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent bg-opacity-20 border-2 border-accent rounded-xl p-4 mb-6"
          >
            <p className="text-accent font-body font-semibold">
              ⚠️ Unable to load Firebase data. Please check your connection and refresh the page.
            </p>
            {(tournamentsError || usersError || paymentsError) && (
              <p className="text-xs text-gray-400 mt-2">
                Error: {(tournamentsError || usersError || paymentsError)?.message || 'Unknown error'}
              </p>
            )}
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && !hasError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 mb-6"
          >
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 font-body">Loading dashboard data...</p>
          </motion.div>
        )}

        {/* Quick Stats */}
        {!isLoading && !hasError && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {actions.map((action) => (
                <ActionCard key={action.title} {...action} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


