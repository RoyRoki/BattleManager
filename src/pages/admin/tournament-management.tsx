import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { Tournament, TournamentStatus } from '../../types';
import { tournamentSchema } from '../../utils/validations';
import { encryptCredentials } from '../../utils/encryptCredentials';
import { uploadImage } from '../../services/cloudinaryService';
import { getSuggestedTournamentStatus } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiUsers, HiPhotograph, HiFilter, HiExclamationCircle, HiClipboardCopy, HiLink, HiChevronDown, HiCheck } from 'react-icons/hi';

export const TournamentManagement: React.FC = () => {
  const [tournaments, loading] = useCollection(
    collection(firestore, 'tournaments')
  ) as unknown as [{ docs: any[] } | null, boolean];
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');
  const [showEnrolledPlayers, setShowEnrolledPlayers] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [openInlineDropdown, setOpenInlineDropdown] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entry_amount: '',
    max_players: '',
    start_time: '',
    reveal_time: '',
    credentials: '',
    status: 'upcoming' as TournamentStatus,
    banner_url: '',
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
        banner_url: formData.banner_url || undefined,
      });

      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com';

      if (editingTournament) {
        const updateData: any = {
          ...tournamentData,
          status: formData.status,
          updated_at: new Date(),
        };

        // Only update credentials if provided
        if (formData.credentials) {
          updateData.encrypted_credentials = encryptCredentials(formData.credentials);
        }

        await updateDoc(doc(firestore, 'tournaments', editingTournament.id), updateData);
        toast.success('Tournament updated!');
      } else {
        const encryptedCredentials = formData.credentials
          ? encryptCredentials(formData.credentials)
          : undefined;

        await addDoc(collection(firestore, 'tournaments'), {
          ...tournamentData,
          current_players: 0,
          status: formData.status,
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
        status: 'upcoming',
        banner_url: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to save tournament');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadImage(file, 'tournaments/banners');
      setFormData({ ...formData, banner_url: url });
      toast.success('Banner uploaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleStatusChange = async (tournamentId: string, newStatus: TournamentStatus) => {
    try {
      await updateDoc(doc(firestore, 'tournaments', tournamentId), {
        status: newStatus,
        updated_at: new Date(),
      });
      toast.success(`Tournament status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update tournament status');
    }
  };

  const filteredTournaments = useMemo(() => {
    if (!tournaments?.docs) return [];
    
    const allTournaments = tournaments.docs.map((doc: any) => {
      const data = doc.data();
      return {
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
        created_at:
          data.created_at instanceof Date
            ? data.created_at
            : (data.created_at as any)?.toDate?.() || new Date(),
        updated_at:
          data.updated_at instanceof Date
            ? data.updated_at
            : (data.updated_at as any)?.toDate?.() || new Date(),
      } as Tournament;
    });

    if (statusFilter === 'all') {
      return allTournaments.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }

    return allTournaments
      .filter((t) => t.status === statusFilter)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }, [tournaments, statusFilter]);

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
      status: tournament.status,
      banner_url: tournament.banner_url || '',
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

  // Compute effective status based on reveal_time
  const getEffectiveStatus = (tournament: Tournament): TournamentStatus => {
    // If manually set to completed or cancelled, respect that
    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return tournament.status;
    }
    
    // If reveal_time has passed and status is upcoming, show as live
    if (tournament.status === 'upcoming' && tournament.reveal_time) {
      const now = new Date();
      if (now >= new Date(tournament.reveal_time)) {
        return 'live';
      }
    }
    
    return tournament.status;
  };

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'upcoming':
        return 'bg-orange-900 text-orange-300';
      case 'live':
        return 'bg-green-900 text-green-300';
      case 'completed':
        return 'bg-blue-900 text-blue-300';
      case 'cancelled':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-heading text-primary text-glow">
            Tournament Management
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowForm(true);
                setEditingTournament(null);
                setFormData({
                  name: '',
                  description: '',
                  entry_amount: '',
                  max_players: '',
                  start_time: '',
                  reveal_time: '',
                  credentials: '',
                  status: 'upcoming',
                  banner_url: '',
                });
              }}
              className="bg-primary text-bg px-6 py-2 rounded-lg font-heading hover:bg-opacity-80 transition"
            >
              + New Tournament
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <HiFilter className="text-primary" />
            <span className="text-gray-400">Filter by Status:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'upcoming', 'live', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-heading transition ${
                  statusFilter === status
                    ? 'bg-primary text-bg'
                    : 'bg-bg-secondary text-gray-400 hover:bg-opacity-80'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-bg-secondary border border-primary rounded-lg p-6 mb-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-heading text-primary">
                  {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingTournament(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>
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
                <div>
                  <label className="block text-sm mb-2">Status</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          formData.status === 'upcoming' ? 'bg-orange-400' :
                          formData.status === 'live' ? 'bg-green-400 animate-pulse' :
                          formData.status === 'completed' ? 'bg-blue-400' :
                          'bg-red-400'
                        }`} />
                        <span className="capitalize">{formData.status}</span>
                      </div>
                      <HiChevronDown className={`w-5 h-5 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showStatusDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-1 bg-bg-secondary border border-gray-700 rounded-lg overflow-hidden shadow-lg"
                        >
                          {(['upcoming', 'live', 'completed', 'cancelled'] as TournamentStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, status });
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-bg transition ${
                                formData.status === status ? 'bg-bg' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${
                                  status === 'upcoming' ? 'bg-orange-400' :
                                  status === 'live' ? 'bg-green-400' :
                                  status === 'completed' ? 'bg-blue-400' :
                                  'bg-red-400'
                                }`} />
                                <span className="capitalize">{status}</span>
                              </div>
                              {formData.status === status && (
                                <HiCheck className="w-5 h-5 text-primary" />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {formData.reveal_time && formData.status === 'upcoming' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-switches to Live when reveal time passes
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-2">Banner Image</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label
                      htmlFor="banner-upload"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 cursor-pointer hover:border-primary transition ${
                        uploadingBanner ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <HiPhotograph className="w-5 h-5" />
                      {uploadingBanner ? 'Uploading...' : 'Upload Banner'}
                    </label>
                    {formData.banner_url && (
                      <div className="flex-1">
                        <img
                          src={formData.banner_url}
                          alt="Banner preview"
                          className="h-20 w-auto rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    Credentials {editingTournament ? '(Leave empty to keep existing)' : '(Optional)'}
                  </label>
                  <textarea
                    value={formData.credentials}
                    onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    rows={2}
                    placeholder="Tournament credentials (will be encrypted)"
                  />
                </div>
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
        </AnimatePresence>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading tournaments...</div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No tournaments found</p>
            <p className="text-gray-500 text-sm mt-2">
              {statusFilter !== 'all' ? `No ${statusFilter} tournaments` : 'Create your first tournament'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTournaments.map((tournament) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary border border-gray-800 rounded-lg p-4 hover:border-primary transition"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {tournament.banner_url && (
                    <div className="md:w-32 h-32 flex-shrink-0">
                      <img
                        src={tournament.banner_url}
                        alt={tournament.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-heading text-primary">{tournament.name}</h3>
                          {(() => {
                            const suggestedStatus = getSuggestedTournamentStatus(
                              tournament.start_time,
                              tournament.status
                            );
                            if (suggestedStatus !== tournament.status && tournament.status !== 'cancelled') {
                              return (
                                <div className="flex items-center gap-1 text-yellow-400 text-xs" title={`Suggested status: ${suggestedStatus}`}>
                                  <HiExclamationCircle className="w-4 h-4" />
                                  <span className="hidden md:inline">Update to {suggestedStatus}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {tournament.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {tournament.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-3 py-1 rounded text-xs font-heading ${getStatusColor(getEffectiveStatus(tournament))}`}>
                          {getEffectiveStatus(tournament).toUpperCase()}
                        </span>
                        {getEffectiveStatus(tournament) !== tournament.status && (
                          <span className="text-[10px] text-gray-500">
                            (was: {tournament.status})
                          </span>
                        )}
                      </div>
                    </div>
                    {/* T-Link for Banner */}
                    <div className="flex items-center gap-2 mb-3 p-2 bg-bg rounded-lg border border-gray-700">
                      <HiLink className="w-4 h-4 text-primary flex-shrink-0" />
                      <code className="text-xs text-gray-300 flex-1 truncate">/tournament/{tournament.id}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`/tournament/${tournament.id}`);
                          toast.success('T-Link copied!');
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Copy T-Link for banner"
                      >
                        <HiClipboardCopy className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-400">Entry Fee</p>
                        <p className="text-sm text-white">{tournament.entry_amount} pts</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Players</p>
                        <p className="text-sm text-white">
                          {tournament.current_players}/{tournament.max_players}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Start Time</p>
                        <p className="text-xs text-white">
                          {new Date(tournament.start_time).toLocaleString()}
                        </p>
                      </div>
                      {tournament.reveal_time && (
                        <div>
                          <p className="text-xs text-gray-400">Reveal Time</p>
                          <p className="text-xs text-white">
                            {new Date(tournament.reveal_time).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(tournament)}
                        className="bg-primary text-bg px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowEnrolledPlayers(tournament.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition flex items-center gap-2"
                      >
                        <HiUsers className="w-4 h-4" />
                        View Players ({tournament.current_players})
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setOpenInlineDropdown(openInlineDropdown === tournament.id ? null : tournament.id)}
                          className="bg-bg border border-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:border-primary transition flex items-center gap-2"
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            tournament.status === 'upcoming' ? 'bg-orange-400' :
                            tournament.status === 'live' ? 'bg-green-400' :
                            tournament.status === 'completed' ? 'bg-blue-400' :
                            'bg-red-400'
                          }`} />
                          <span className="capitalize">{tournament.status}</span>
                          <HiChevronDown className={`w-4 h-4 transition-transform ${openInlineDropdown === tournament.id ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openInlineDropdown === tournament.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 w-40 mt-1 bg-bg-secondary border border-gray-700 rounded-lg overflow-hidden shadow-lg"
                            >
                              {(['upcoming', 'live', 'completed', 'cancelled'] as TournamentStatus[]).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    handleStatusChange(tournament.id, status);
                                    setOpenInlineDropdown(null);
                                  }}
                                  className={`w-full px-4 py-2 flex items-center justify-between hover:bg-bg transition text-sm ${
                                    tournament.status === status ? 'bg-bg' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                      status === 'upcoming' ? 'bg-orange-400' :
                                      status === 'live' ? 'bg-green-400' :
                                      status === 'completed' ? 'bg-blue-400' :
                                      'bg-red-400'
                                    }`} />
                                    <span className="capitalize">{status}</span>
                                  </div>
                                  {tournament.status === status && (
                                    <HiCheck className="w-4 h-4 text-primary" />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button
                        onClick={() => handleDelete(tournament.id)}
                        className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Enrolled Players Modal */}
        <AnimatePresence>
          {showEnrolledPlayers && (
            <EnrolledPlayersModal
              tournamentId={showEnrolledPlayers}
              onClose={() => setShowEnrolledPlayers(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Enrolled Players Modal Component
interface EnrolledPlayersModalProps {
  tournamentId: string;
  onClose: () => void;
}

const EnrolledPlayersModal: React.FC<EnrolledPlayersModalProps> = ({ tournamentId, onClose }) => {
  const [users, loading] = useCollection(
    collection(firestore, 'users')
  ) as unknown as [{ docs: any[] } | null, boolean];

  const enrolledUsers = useMemo(() => {
    if (!users?.docs) return [];
    return users.docs
      .filter((doc) => {
        const data = doc.data();
        return data.enrolled_tournaments?.includes(tournamentId);
      })
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          mobile_no: data.mobile_no,
          name: data.name || 'Unknown',
          ff_id: data.ff_id || 'N/A',
          points: data.points || 0,
          avatar_url: data.avatar_url,
        };
      });
  }, [users, tournamentId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-secondary border border-primary rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-heading text-primary">Enrolled Players</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading players...</div>
        ) : enrolledUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No players enrolled yet</div>
        ) : (
          <div className="space-y-2">
            {enrolledUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-bg border border-gray-800 rounded-lg p-4 flex items-center gap-4"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-bg font-heading">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-heading">{user.name}</p>
                  <p className="text-sm text-gray-400">Mobile: {user.mobile_no}</p>
                  <p className="text-xs text-gray-500">FF ID: {user.ff_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-primary">{user.points} pts</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

