import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { User } from '../../types';
import { motion } from 'framer-motion';

export const UserManagement: React.FC = () => {
  const [users, loading] = useCollection(
    collection(firestore, 'users')
  ) as unknown as [{ docs: any[] } | null, boolean];

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-heading text-primary mb-6 text-glow">User Management</h1>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            {users?.docs.map((doc: any) => {
              const data = doc.data();
              const user = {
                ...data,
                created_at:
                  data.created_at instanceof Date
                    ? data.created_at
                    : (data.created_at as any)?.toDate?.() || new Date(),
                updated_at:
                  data.updated_at instanceof Date
                    ? data.updated_at
                    : (data.updated_at as any)?.toDate?.() || new Date(),
              } as User;

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-heading text-primary">
                        {user.name || 'No Name'}
                      </h3>
                      <p className="text-sm text-gray-400">Mobile: {user.mobile_no}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-400">Points: {user.points}</span>
                        <span className="text-gray-400">
                          Tournaments: {user.enrolled_tournaments.length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined: {user.created_at.toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        user.is_active
                          ? 'bg-orange-900 text-orange-300'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

