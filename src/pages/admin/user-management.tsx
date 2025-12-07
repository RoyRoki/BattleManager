import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { User } from '../../types';
import { motion } from 'framer-motion';
import { HiSearch } from 'react-icons/hi';

export const UserManagement: React.FC = () => {
  const [users, loading, error] = useCollection(
    collection(firestore, 'users')
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];
  const [searchQuery, setSearchQuery] = useState('');
  
  // Log errors for debugging
  if (error) {
    console.error('UserManagement: Firestore error:', error);
  }

  // Filter users based on search query (name and FF ID)
  const filteredUsers = useMemo(() => {
    if (!users?.docs) return [];
    
    if (!searchQuery.trim()) {
      return users.docs;
    }

    const query = searchQuery.toLowerCase().trim();
    return users.docs.filter((doc: any) => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const ffId = (data.ff_id || '').toLowerCase();
      const email = (data.email || '').toLowerCase();
      
      return name.includes(query) || ffId.includes(query) || email.includes(query);
    });
  }, [users, searchQuery]);

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-heading text-primary mb-6 text-glow">User Management</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or FF ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-accent bg-opacity-20 border border-accent rounded-lg p-4 mb-6">
            <p className="text-accent font-body">
              ⚠️ Unable to load user data. Please check your connection and refresh the page.
            </p>
            <p className="text-xs text-gray-400 mt-2">Error: {error.message || 'Unknown error'}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {searchQuery.trim() ? 'No users found matching your search.' : 'No users found.'}
                </p>
              </div>
            ) : (
              filteredUsers.map((doc: any) => {
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
                      <p className="text-sm text-gray-400">Email: {user.email}</p>
                      {(user as any).ff_id && (
                        <p className="text-sm text-gray-400">FF ID: {(user as any).ff_id}</p>
                      )}
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
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

