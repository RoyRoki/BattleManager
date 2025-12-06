import React from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { ROUTES } from '../../utils/constants';
import { motion } from 'framer-motion';

export const AdminDashboard: React.FC = () => {
  const [tournaments, tournamentsLoading, tournamentsError] = useCollection(collection(firestore, 'tournaments'));
  const [users, usersLoading, usersError] = useCollection(collection(firestore, 'users'));
  const [payments, paymentsLoading, paymentsError] = useCollection(collection(firestore, 'payments'));

  // Check for Firestore connection errors
  if (tournamentsError || usersError || paymentsError) {
    console.error('AdminDashboard: Firestore errors:', { tournamentsError, usersError, paymentsError });
  }

  const isLoading = tournamentsLoading || usersLoading || paymentsLoading;
  const hasError = tournamentsError || usersError || paymentsError;

  const pendingPayments =
    payments?.docs.filter((doc) => doc.data().status === 'pending').length || 0;

  const stats = [
    {
      label: 'Total Tournaments',
      value: tournaments?.docs.length || 0,
      link: ROUTES.ADMIN_TOURNAMENTS,
      color: 'primary',
    },
    {
      label: 'Total Users',
      value: users?.docs.length || 0,
      link: ROUTES.ADMIN_USERS,
      color: 'primary',
    },
    {
      label: 'Pending Payments',
      value: pendingPayments,
      link: ROUTES.ADMIN_PAYMENTS,
      color: 'accent',
    },
    {
      label: 'Support Chats',
      value: '💬',
      link: ROUTES.ADMIN_SUPPORT_CHAT,
      color: 'primary',
    },
  ];

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-heading text-primary mb-6 text-glow"
        >
          Admin Dashboard
        </motion.h1>

        {/* Error Message */}
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent bg-opacity-20 border border-accent rounded-lg p-4 mb-6"
          >
            <p className="text-accent font-body">
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
            className="text-center py-8 mb-6"
          >
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading dashboard data...</p>
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Link key={stat.label} to={stat.link}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-bg-secondary rounded-lg p-6 hover:border-opacity-80 transition aspect-square flex flex-col justify-center items-center text-center ${
                  stat.color === 'primary'
                    ? 'border border-primary'
                    : 'border border-accent'
                }`}
              >
                <p className="text-gray-400 mb-2 text-sm">{stat.label}</p>
                <p
                  className={`text-3xl font-heading ${
                    stat.color === 'primary' ? 'text-primary' : 'text-accent'
                  }`}
                >
                  {stat.value}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link to={ROUTES.ADMIN_TOURNAMENTS}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-bg-secondary border border-primary rounded-lg p-6 aspect-square flex flex-col justify-center"
            >
              <h3 className="text-xl font-heading text-primary mb-2">Manage Tournaments</h3>
              <p className="text-gray-400 text-sm">Create, edit, and manage tournaments</p>
            </motion.div>
          </Link>

          <Link to={ROUTES.ADMIN_PAYMENTS}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-bg-secondary border border-accent rounded-lg p-6 aspect-square flex flex-col justify-center"
            >
              <h3 className="text-xl font-heading text-accent mb-2">Manage Payments</h3>
              <p className="text-gray-400 text-sm">Approve or reject payment requests</p>
            </motion.div>
          </Link>

          <Link to={ROUTES.ADMIN_SUPPORT_CHAT}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-bg-secondary border border-primary rounded-lg p-6 aspect-square flex flex-col justify-center"
            >
              <h3 className="text-xl font-heading text-primary mb-2">Support Chat</h3>
              <p className="text-gray-400 text-sm">Respond to user support messages</p>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
};


