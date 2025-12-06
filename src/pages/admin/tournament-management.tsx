import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { Tournament } from '../../types';
import { tournamentSchema } from '../../utils/validations';
import { encryptCredentials } from '../../utils/encryptCredentials';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const TournamentManagement: React.FC = () => {
  const [tournaments, loading] = useCollection(
    collection(firestore, 'tournaments')
  ) as unknown as [{ docs: any[] } | null, boolean];
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entry_amount: '',
    max_players: '',
    start_time: '',
    reveal_time: '',
    credentials: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tournamentData = tournamentSchema.parse({
        name: formData.name,
        description: formData.description || undefined,
        entry_amount: parseFloat(formData.entry_amount),
        max_players: parseInt(formData.max_players),
        start_time: new Date(formData.start_time),
        reveal_time: formData.reveal_time ? new Date(formData.reveal_time) : undefined,
      });

      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com';

      if (editingTournament) {
        await updateDoc(doc(firestore, 'tournaments', editingTournament.id), {
          ...tournamentData,
          updated_at: new Date(),
        });
        toast.success('Tournament updated!');
      } else {
        const encryptedCredentials = formData.credentials
          ? encryptCredentials(formData.credentials)
          : undefined;

        await addDoc(collection(firestore, 'tournaments'), {
          ...tournamentData,
          current_players: 0,
          status: 'upcoming',
          created_by: adminEmail,
          encrypted_credentials: encryptedCredentials,
          created_at: new Date(),
          updated_at: new Date(),
        });
        toast.success('Tournament created!');
      }

      setShowForm(false);
      setEditingTournament(null);
      setFormData({
        name: '',
        description: '',
        entry_amount: '',
        max_players: '',
        start_time: '',
        reveal_time: '',
        credentials: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to save tournament');
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      description: tournament.description || '',
      entry_amount: tournament.entry_amount.toString(),
      max_players: tournament.max_players.toString(),
      start_time: new Date(tournament.start_time).toISOString().slice(0, 16),
      reveal_time: tournament.reveal_time
        ? new Date(tournament.reveal_time).toISOString().slice(0, 16)
        : '',
      credentials: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;

    try {
      await deleteDoc(doc(firestore, 'tournaments', id));
      toast.success('Tournament deleted!');
    } catch (error) {
      toast.error('Failed to delete tournament');
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-heading text-primary text-glow">
            Tournament Management
          </h1>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingTournament(null);
            }}
            className="bg-primary text-bg px-6 py-2 rounded-lg font-heading hover:bg-opacity-80 transition"
          >
            + New Tournament
          </button>
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-bg-secondary border border-primary rounded-lg p-6 mb-6"
          >
            <h2 className="text-xl font-heading text-primary mb-4">
              {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Tournament Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Entry Amount (Points)</label>
                  <input
                    type="number"
                    value={formData.entry_amount}
                    onChange={(e) => setFormData({ ...formData, entry_amount: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    min="10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Max Players</label>
                  <input
                    type="number"
                    value={formData.max_players}
                    onChange={(e) => setFormData({ ...formData, max_players: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    min="2"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Reveal Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.reveal_time}
                    onChange={(e) => setFormData({ ...formData, reveal_time: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              {!editingTournament && (
                <div>
                  <label className="block text-sm mb-2">Credentials (Optional)</label>
                  <textarea
                    value={formData.credentials}
                    onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    rows={2}
                    placeholder="Tournament credentials (will be encrypted)"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-bg py-2 rounded-lg font-heading hover:bg-opacity-80 transition"
                >
                  {editingTournament ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTournament(null);
                  }}
                  className="flex-1 bg-bg-tertiary text-white py-2 rounded-lg hover:bg-opacity-80 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            {tournaments?.docs.map((doc: any) => {
              const data = doc.data();
              const tournament = {
                id: doc.id,
                ...data,
                start_time:
                  data.start_time instanceof Date
                    ? data.start_time
                    : (data.start_time as any)?.toDate?.() || new Date(),
                reveal_time:
                  data.reveal_time instanceof Date
                    ? data.reveal_time
                    : (data.reveal_time as any)?.toDate?.() || undefined,
              } as Tournament;

              return (
                <div
                  key={doc.id}
                  className="bg-bg-secondary border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-heading text-primary">{tournament.name}</h3>
                      <p className="text-sm text-gray-400">
                        {tournament.entry_amount} pts • {tournament.current_players}/
                        {tournament.max_players} players
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(tournament.start_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(tournament)}
                        className="bg-primary text-bg px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tournament.id)}
                        className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

