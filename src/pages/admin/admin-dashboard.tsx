import React from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { ROUTES } from '../../utils/constants';
import { motion } from 'framer-motion';

export const AdminDashboard: React.FC = () => {
  const [tournaments] = useCollection(collection(firestore, 'tournaments'));
  const [users] = useCollection(collection(firestore, 'users'));
  const [payments] = useCollection(collection(firestore, 'payments'));

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Link key={stat.label} to={stat.link}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-bg-secondary rounded-lg p-6 hover:border-opacity-80 transition ${
                  stat.color === 'primary'
                    ? 'border border-primary'
                    : 'border border-accent'
                }`}
              >
                <p className="text-gray-400 mb-2">{stat.label}</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to={ROUTES.ADMIN_TOURNAMENTS}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-bg-secondary border border-primary rounded-lg p-6"
            >
              <h3 className="text-xl font-heading text-primary mb-2">Manage Tournaments</h3>
              <p className="text-gray-400">Create, edit, and manage tournaments</p>
            </motion.div>
          </Link>

          <Link to={ROUTES.ADMIN_PAYMENTS}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-bg-secondary border border-accent rounded-lg p-6"
            >
              <h3 className="text-xl font-heading text-accent mb-2">Manage Payments</h3>
              <p className="text-gray-400">Approve or reject payment requests</p>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
};


